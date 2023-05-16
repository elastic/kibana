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
  verifySnoozeScheduleLimit,
} from '../common';
import { AlertingAuthorizationEntity, WriteOperations } from '../../authorization';
import {
  RawRule,
  IntervalSchedule,
  RuleSnooze,
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

interface EnsureAuthorizedParams {
  action?: RuleAuditAction;
  operation?: WriteOperations;
}

interface UpdateActionParams {
  actions: NormalizedAlertAction[];
  allowMissingConnectorSecrets?: boolean;
}

interface UpdateParamsParams {
  params: RuleTypeParams;
}

interface MaybeIncrementRevisionParams {
  shouldIncrementRevision?: (params?: RuleTypeParams) => boolean;
}

interface CreateAPIKeyParams {
  forceUpdate?: boolean;
}

interface NewAttributes {
  name?: string;
  tags?: string[];
  schedule?: IntervalSchedule;
  muteAll?: boolean;
  snoozeSchedule?: RuleSnooze;
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

export interface RulesUpdateFlowSteps {
  prepareRuleForUpdate: (savedObject: SavedObject<RawRule>) => Promise<void>;
  getRuleFieldsWithRefs: (id: string) => {
    actions: NormalizedAlertAction[];
    params: RuleTypeParams;
  };
  ensureAuthorizedAndRuleTypeEnabled: (
    id: string,
    params?: EnsureAuthorizedParams
  ) => Promise<void>;
  extractReferencesFromParamsAndActions: (id: string) => Promise<void>;
  updateActions: (id: string, updateActionParams: UpdateActionParams) => Promise<void>;
  updateParams: (id: string, updateParamsParams: UpdateParamsParams) => Promise<void>;
  updateAttributes: (id: string, newAttributes: NewAttributes) => Promise<void>;
  createAPIKey: (id: string, params?: CreateAPIKeyParams) => Promise<void>;
  maybeIncrementRevision: (id: string, params?: MaybeIncrementRevisionParams) => Promise<void>;
  validateAttributes: (id: string) => Promise<void>;
  getUpdatedAttributeAndRefsForSaving: (id: string) => Promise<{
    attributes: RawRule;
    references: SavedObjectReference[];
  }>;
  getApiKeysMap: () => ApiKeysMap;
  cleanup: () => Promise<void>;
}

type RulesUpdateFlow = (context: RulesClientContext) => RulesUpdateFlowSteps;

export const rulesUpdateFlow: RulesUpdateFlow = (context: RulesClientContext) => {
  let rulesUpdateState: RulesUpdateState = {};
  let apiKeysMap: ApiKeysMap = new Map();

  const prepareRuleForUpdate = async (savedObject: SavedObject<RawRule>) => {
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
      savedObject.id,
      ruleType,
      savedObject.attributes.params,
      savedObject.references || []
    );

    const actionsWithRefs = injectReferencesIntoActions(
      savedObject.id,
      savedObject.attributes.actions || [],
      savedObject.references || []
    );

    if (savedObject.attributes.apiKey) {
      apiKeysMap.set(savedObject.id, {
        oldApiKey: savedObject.attributes.apiKey,
        oldApiKeyCreatedByUser: savedObject.attributes.apiKeyCreatedByUser,
      });
    }

    rulesUpdateState[savedObject.id] = {
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
    const ruleState = rulesUpdateState[id];
    if (!ruleState) {
      throw new Error(
        `Rule with id ${id} not added to update flow, please add rule before updating.`
      );
    }
    return ruleState;
  };

  const getRuleFieldsWithRefs = (id: string) => {
    const ruleState = rulesUpdateState[id];
    if (!ruleState) {
      throw new Error(
        `Rule with id ${id} not added to update flow, please add rule before getting fields with ref.`
      );
    }
    return ruleState.fieldsWithRefs;
  };

  const getApiKeysMap = () => apiKeysMap;

  const ensureAuthorizedAndRuleTypeEnabled = async (
    id: string,
    params?: EnsureAuthorizedParams
  ) => {
    const { authorization, auditLogger } = context;
    const { action = RuleAuditAction.UPDATE, operation = WriteOperations.Update } = params || {};
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

  const updateActions = async (id: string, updateActionParams: UpdateActionParams) => {
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

    const notifyWhen = getRuleNotifyWhenType(
      newAttributes.notifyWhen || updatedAttributes.notifyWhen || null,
      newAttributes.throttle || updatedAttributes.throttle || null
    );

    await updateInternalAttributes(id, {
      ...newAttributes,
      notifyWhen,
    });
  };

  const createAPIKey = async (id: string, params?: CreateAPIKeyParams) => {
    const {
      savedObject: { attributes },
      updatedAttributes,
    } = getRuleToUpdate(id);

    const { forceUpdate = false } = params || {};

    const username = await context.getUserName();

    const apiKeyAttributes = await createNewAPIKeySet(context, {
      id,
      ruleName: updatedAttributes.name,
      username,
      shouldUpdateApiKey: attributes.enabled || forceUpdate,
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

  const maybeIncrementRevision = async (id: string, params?: MaybeIncrementRevisionParams) => {
    const {
      savedObject: { attributes },
      updatedAttributes,
      validation: { hasExtractedRefs },
    } = getRuleToUpdate(id);

    const { shouldIncrementRevision = () => true } = params || {};

    if (!hasExtractedRefs) {
      throw new Error('References must be extract before incrementing revision.');
    }

    if (updatedAttributes.revision > attributes.revision) {
      return;
    }

    if (!shouldIncrementRevision(updatedAttributes.params)) {
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

  const validateAttributes = async (id: string) => {
    const { updatedAttributes } = getRuleToUpdate(id);
    const ruleType = context.ruleTypeRegistry.get(updatedAttributes.alertTypeId);

    validateScheduleInterval(context, updatedAttributes.schedule.interval, ruleType.id, id);
    validateScheduleOperation(updatedAttributes.schedule, updatedAttributes.actions, id);
    verifySnoozeScheduleLimit(updatedAttributes);

    getRuleToUpdate(id).validation.hasValidatedAttributes = true;
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

  return {
    prepareRuleForUpdate,
    ensureAuthorizedAndRuleTypeEnabled,
    updateActions,
    updateParams,
    extractReferencesFromParamsAndActions,
    createAPIKey,
    updateAttributes,
    validateAttributes,
    getUpdatedAttributeAndRefsForSaving,
    maybeIncrementRevision,
    getRuleFieldsWithRefs,
    getApiKeysMap,
    cleanup,
  };
};
