/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject, SavedObjectReference, SavedObjectAttributes } from '@kbn/core/server';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  injectReferencesIntoParams,
  injectReferencesIntoActions,
  getSnoozeAttributes,
  verifySnoozeScheduleLimit,
} from '../common';
import { AlertingAuthorizationEntity, WriteOperations } from '../../authorization';
import {
  RawRule,
  IntervalSchedule,
  RuleSnoozeSchedule,
  RuleNotifyWhenType,
  RuleTypeParams,
} from '../../types';
import {
  RulesClientContext,
  NormalizedAlertAction,
  NormalizedAlertActionWithGeneratedValues,
} from '../types';
import {
  migrateLegacyActions,
  validateActions,
  extractReferences,
  validateScheduleInterval,
  validateScheduleOperation,
  addGeneratedActionValues,
  updateMeta,
  createNewAPIKeySet,
  shouldIncrementRevisionByRoot,
  shouldIncrementRevisionByParams,
} from '.';
import { getMappedParams } from '../common/mapped_params_utils';
import { bulkMarkApiKeysForInvalidation } from '../../invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import {
  validateRuleTypeParams,
  validateMutatedRuleTypeParams,
  getRuleNotifyWhenType,
} from '../../lib';

export interface RuleParamsModifierResult {
  modifiedParams: RuleTypeParams;
  isParamsUpdateSkipped: boolean;
}

interface EnsureAuthorizedParams {
  action: RuleAuditAction;
  operation: WriteOperations;
}

interface UpdateActionParams {
  actions: NormalizedAlertAction[];
  allowMissingConnectorSecrets?: boolean;
}

interface UpdateParamsParams {
  params: RuleTypeParams;
}

interface NewAttributes {
  name?: string;
  tags?: string[];
  schedule?: IntervalSchedule;
  snoozeSchedule?: RuleSnoozeSchedule;
  throttle?: string | null;
  notifyWhen?: RuleNotifyWhenType | null;
}

type RulesUpdateState = Record<
  string,
  {
    savedObject: SavedObject<RawRule>;
    updatedAttributes: RawRule;
    fieldsWithRefs: {
      actions: NormalizedAlertAction[];
      params: RuleTypeParams;
    };
    extractedRefs: {
      actions?: RawRule['actions'];
      params?: RuleTypeParams;
      references?: SavedObjectReference[];
    };
    validation: {
      hasValidatedAttributes: boolean;
      hasExtractedRefs: boolean;
    };
  }
>;

type ApiKeysMap = Map<
  string,
  {
    oldApiKey?: string;
    newApiKey?: string;
    oldApiKeyCreatedByUser?: boolean | null;
    newApiKeyCreatedByUser?: boolean | null;
  }
>;

export const rulesUpdateFlow = (context: RulesClientContext) => {
  let rulesUpdateState: RulesUpdateState = {};
  let apiKeysMap: ApiKeysMap = new Map();

  const prepareRuleForUpdate = async (id: string, savedObject: SavedObject<RawRule>) => {
    // Initialize injected references
    const ruleType = context.ruleTypeRegistry.get(savedObject.attributes.alertTypeId);

    // migrate legacy actions only for SIEM rules
    const migratedActions = await migrateLegacyActions(context, {
      ruleId: savedObject.id,
      actions: savedObject.attributes.actions,
      references: savedObject.references,
      attributes: savedObject.attributes,
    });

    if (migratedActions.hasLegacyActions) {
      savedObject.attributes.actions = migratedActions.resultedActions;
      savedObject.references = migratedActions.resultedReferences;
    }

    const paramsWithRefs = injectReferencesIntoParams(
      id,
      ruleType,
      savedObject.attributes.params,
      savedObject.references || []
    );

    const actionsWithRefs = injectReferencesIntoActions(
      id,
      savedObject.attributes.actions || [],
      savedObject.references || []
    );

    if (savedObject.attributes.apiKey) {
      apiKeysMap.set(id, {
        oldApiKey: savedObject.attributes.apiKey,
        oldApiKeyCreatedByUser: savedObject.attributes.apiKeyCreatedByUser,
      });
    }

    rulesUpdateState[id] = {
      savedObject,
      updatedAttributes: savedObject.attributes,
      extractedRefs: {},
      fieldsWithRefs: {
        params: paramsWithRefs,
        actions: actionsWithRefs,
      },
      validation: {
        hasValidatedAttributes: false,
        // Initialize to need to extract refs to true, only need to extract when we changes
        // actions or params
        hasExtractedRefs: true,
      },
    };
  };

  const updateInternalAttributes = async (id: string, newAttributes: Partial<RawRule>) => {
    const { updatedAttributes } = getRuleToUpdate(id);
    const username = await context.getUserName();

    const result = updateMeta(context, {
      ...updatedAttributes,
      ...newAttributes,
      updatedBy: username,
      updatedAt: new Date().toISOString(),
    });

    const mappedParams = getMappedParams(result.params);

    if (Object.keys(mappedParams).length) {
      result.mapped_params = mappedParams;
    }

    getRuleToUpdate(id).updatedAttributes = {
      ...getRuleToUpdate(id).updatedAttributes,
      ...result,
    };

    getRuleToUpdate(id).validation.hasValidatedAttributes = false;
  };

  const getRuleToUpdate = (id: string) => {
    const rule = rulesUpdateState[id];
    if (!rule) {
      throw new Error(
        `Rule with id ${id} not added to update flow, please add rule before updating.`
      );
    }
    return rule;
  };

  const ensureAuthorizedAndRuleTypeEnabled = async (id: string, params: EnsureAuthorizedParams) => {
    const { authorization, auditLogger } = context;
    const { action, operation } = params;
    const {
      savedObject: { attributes },
    } = getRuleToUpdate(id);

    try {
      await authorization.ensureAuthorized({
        ruleTypeId: attributes.alertTypeId,
        consumer: attributes.consumer,
        operation,
        entity: AlertingAuthorizationEntity.Rule,
      });
      if (attributes.actions.length) {
        await context.actionsAuthorization.ensureAuthorized('execute');
      }
    } catch (error) {
      auditLogger?.log(
        ruleAuditEvent({
          action,
          savedObject: { type: 'alert', id },
          error,
        })
      );
      throw error;
    }

    context.ruleTypeRegistry.ensureRuleTypeEnabled(attributes.alertTypeId);
  };

  const extractReferencesFromParamsAndActions = async (id: string) => {
    const {
      savedObject: { attributes },
      fieldsWithRefs: { actions, params },
    } = getRuleToUpdate(id);
    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId);

    const extractedRefs = await extractReferences(
      context,
      ruleType,
      actions as NormalizedAlertActionWithGeneratedValues[],
      params
    );

    await updateInternalAttributes(id, {
      actions: extractedRefs.actions,
      params: extractedRefs.params as RawRule['params'],
    });

    getRuleToUpdate(id).extractedRefs = extractedRefs;
    getRuleToUpdate(id).validation.hasExtractedRefs = true;
  };

  const createAPIKey = async (id: string) => {
    const {
      savedObject: { attributes },
      updatedAttributes,
    } = getRuleToUpdate(id);

    const username = await context.getUserName();

    const apiKeyAttributes = await createNewAPIKeySet(context, {
      id,
      ruleName: updatedAttributes.name,
      username,
      shouldUpdateApiKey: attributes.enabled,
      errorMessage: 'Error updating rule: could not create API key',
    });

    // collect generated API keys
    if (apiKeyAttributes.apiKey) {
      apiKeysMap.set(id, {
        ...apiKeysMap.get(id),
        newApiKey: apiKeyAttributes.apiKey,
        newApiKeyCreatedByUser: apiKeyAttributes.apiKeyCreatedByUser,
      });
    }

    await updateInternalAttributes(id, apiKeyAttributes);
  };

  const maybeIncrementRevision = async (id: string) => {
    const {
      savedObject: { attributes },
      updatedAttributes,
    } = getRuleToUpdate(id);

    if (updatedAttributes.revision > attributes.revision) {
      return;
    }

    const shouldIncrementByRoot = shouldIncrementRevisionByRoot(attributes, updatedAttributes);

    const shouldIncrementByParams = shouldIncrementRevisionByParams(
      attributes.params,
      updatedAttributes.params
    );

    if (shouldIncrementByRoot || shouldIncrementByParams) {
      await updateInternalAttributes(id, { revision: updatedAttributes.revision + 1 });
    }
  };

  const updateAction = async (id: string, updateActionParams: UpdateActionParams) => {
    const { updatedAttributes } = getRuleToUpdate(id);
    const { actions, allowMissingConnectorSecrets } = updateActionParams;
    const normalizedAlertAction = addGeneratedActionValues(actions);

    // Validate action
    const ruleType = context.ruleTypeRegistry.get(updatedAttributes.alertTypeId);
    try {
      // If validateActions fails on the first attempt, it may be because of legacy rule-level frequency params
      await validateActions(
        context,
        ruleType,
        {
          ...updatedAttributes,
          actions: normalizedAlertAction,
        },
        allowMissingConnectorSecrets
      );
    } catch (e) {
      await updateInternalAttributes(id, {
        ...updatedAttributes,
        notifyWhen: undefined,
        throttle: undefined,
      });
      await validateActions(
        context,
        ruleType,
        {
          ...getRuleToUpdate(id).updatedAttributes,
          actions: normalizedAlertAction,
        },
        allowMissingConnectorSecrets
      );
    }
    getRuleToUpdate(id).fieldsWithRefs.actions = normalizedAlertAction;
    getRuleToUpdate(id).validation.hasExtractedRefs = false;
  };

  const updateParams = async (id: string, updateParamsParams: UpdateParamsParams) => {
    const {
      savedObject: { attributes, references },
    } = getRuleToUpdate(id);
    const { params } = updateParamsParams;

    const ruleType = context.ruleTypeRegistry.get(attributes.alertTypeId);
    const paramsWithRefs = injectReferencesIntoParams(
      id,
      ruleType,
      params as SavedObjectAttributes,
      references || []
    );

    const validatedAlertTypeParams = validateRuleTypeParams(
      paramsWithRefs,
      ruleType.validate.params
    );
    const validatedMutatedAlertTypeParams = validateMutatedRuleTypeParams(
      validatedAlertTypeParams,
      attributes.params,
      ruleType.validate.params
    );

    getRuleToUpdate(id).fieldsWithRefs.params = validatedMutatedAlertTypeParams;
    getRuleToUpdate(id).validation.hasExtractedRefs = false;
  };

  const updateAttributes = async (id: string, newAttributes: NewAttributes) => {
    const { updatedAttributes } = getRuleToUpdate(id);
    const { snoozeSchedule, ...rest } = newAttributes;

    const notifyWhen = getRuleNotifyWhenType(
      newAttributes.notifyWhen || updatedAttributes.notifyWhen || null,
      newAttributes.throttle || updatedAttributes.throttle || null
    );

    await updateInternalAttributes(id, {
      ...rest,
      ...(snoozeSchedule ? { ...getSnoozeAttributes(updatedAttributes, snoozeSchedule) } : {}),
      notifyWhen,
    });
  };

  const validateAttributes = async (id: string) => {
    const { updatedAttributes } = getRuleToUpdate(id);
    const ruleType = context.ruleTypeRegistry.get(updatedAttributes.alertTypeId);

    validateScheduleInterval(context, updatedAttributes.schedule.interval, ruleType.id, id);
    validateScheduleOperation(updatedAttributes.schedule, updatedAttributes.actions, id);
    verifySnoozeScheduleLimit(updatedAttributes);

    getRuleToUpdate(id).validation.hasValidatedAttributes = true;
  };

  const cleanup = async () => {
    if (apiKeysMap.size > 0) {
      await bulkMarkApiKeysForInvalidation(
        {
          apiKeys: Array.from(apiKeysMap.values())
            .filter((value) => value.newApiKey && !value.newApiKeyCreatedByUser)
            .map((value) => value.newApiKey as string),
        },
        context.logger,
        context.unsecuredSavedObjectsClient
      );
    }
    apiKeysMap = new Map();
    rulesUpdateState = {};
  };

  const getUpdatedAttributeAndRefsForSaving = async (id: string) => {
    const { hasExtractedRefs, hasValidatedAttributes } = getRuleToUpdate(id).validation;

    if (!hasValidatedAttributes) {
      throw new Error('New rule attribute need to be validate before saving.');
    }
    if (!hasExtractedRefs) {
      throw new Error('Extract references before saving.');
    }

    return {
      attributes: getRuleToUpdate(id).updatedAttributes,
      references: getRuleToUpdate(id).extractedRefs.references!,
    };
  };

  return {
    prepareRuleForUpdate,
    ensureAuthorizedAndRuleTypeEnabled,
    updateAction,
    updateParams,
    extractReferencesFromParamsAndActions,
    createAPIKey,
    updateAttributes,
    validateAttributes,
    cleanup,
    getUpdatedAttributeAndRefsForSaving,
    maybeIncrementRevision,
  };
};
