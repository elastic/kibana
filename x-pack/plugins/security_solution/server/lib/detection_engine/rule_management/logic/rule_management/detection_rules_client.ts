/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { SharedServices } from '@kbn/ml-plugin/server/shared_services';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { MlAuthz } from '../../../../machine_learning/authz';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import type {
  RuleCreateProps,
  RuleObjectId,
  RuleToImport,
  PatchRuleRequestBody,
  RuleUpdateProps,
} from '../../../../../../common/api/detection_engine';

import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';

import { readRules } from './read_rules';

import {
  convertPatchAPIToInternalSchema,
  convertUpdateAPIToInternalSchema,
  convertCreateAPIToInternalSchema,
} from '../../normalization/rule_converters';
import { transformAlertToRuleAction } from '../../../../../../common/detection_engine/transform_actions';
import type { RuleAlertType, RuleParams } from '../../../rule_schema';
import { createBulkErrorObject } from '../../../routes/utils';
import { getIdError } from '../../utils/utils';
import { throwAuthzError } from '../../../../machine_learning/validation';

class ClientError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CreateRuleOptions {
  /* Optionally pass an ID to use for the rule document. If not provided, an ID will be generated. */
  /* This is the ES document ID, NOT the rule_id */
  id?: string;
  immutable?: boolean;
  defaultEnabled?: boolean;
  allowMissingConnectorSecrets?: boolean;
}

export interface _UpdateRuleProps {
  existingRule: RuleAlertType;
  ruleUpdate: RuleUpdateProps;
}

export interface _PatchRuleProps {
  existingRule: RuleAlertType;
  nextParams: PatchRuleRequestBody;
}

interface CreateCustomRuleProps {
  params: RuleCreateProps;
}

interface CreatePrebuiltRuleProps {
  ruleAsset: PrebuiltRuleAsset;
}

interface UpdateRuleProps {
  ruleUpdate: RuleUpdateProps;
}

interface PatchRuleProps {
  nextParams: PatchRuleRequestBody;
}

interface DeleteRuleProps {
  ruleId: RuleObjectId;
}

interface UpgradePrebuiltRuleProps {
  ruleAsset: PrebuiltRuleAsset;
}

interface ImportRuleOptions {
  allowMissingConnectorSecrets?: boolean;
}

interface ImportRuleProps {
  ruleToImport: RuleToImport;
  overwriteRules?: boolean;
  options: ImportRuleOptions;
}

export interface IRulesManagementClient {
  createCustomRule: (createCustomRulePayload: CreateCustomRuleProps) => Promise<RuleAlertType>;
  createPrebuiltRule: (
    createPrebuiltRulePayload: CreatePrebuiltRuleProps
  ) => Promise<RuleAlertType>;
  updateRule: (updateRulePayload: UpdateRuleProps) => Promise<RuleAlertType>;
  patchRule: (patchRulePayload: PatchRuleProps) => Promise<RuleAlertType>;
  deleteRule: (deleteRulePayload: DeleteRuleProps) => Promise<void>;
  upgradePrebuiltRule: (
    upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps
  ) => Promise<RuleAlertType>;
  importRule: (importRulePayload: ImportRuleProps) => Promise<RuleAlertType>;
}

export const createRulesManagementClient = (
  rulesClient: RulesClient,
  request: KibanaRequest,
  savedObjectsClient: SavedObjectsClientContract,
  licensing: LicensingApiRequestHandlerContext,
  ml?: SharedServices
): IRulesManagementClient => {
  const mlAuthz = buildMlAuthz({
    license: licensing.license,
    ml,
    request,
    savedObjectsClient,
  });

  const client = {
    createCustomRule: async (
      createCustomRulePayload: CreateCustomRuleProps
    ): Promise<RuleAlertType> => {
      return createCustomRule(rulesClient, createCustomRulePayload, mlAuthz);
    },

    createPrebuiltRule: async (
      createPrebuiltRulePayload: CreatePrebuiltRuleProps
    ): Promise<RuleAlertType> => {
      return createPrebuiltRule(rulesClient, createPrebuiltRulePayload, mlAuthz);
    },

    updateRule: async (updateRulePayload: UpdateRuleProps): Promise<RuleAlertType> => {
      return updateRule(rulesClient, updateRulePayload, mlAuthz);
    },

    patchRule: async (patchRulePayload: PatchRuleProps): Promise<RuleAlertType> => {
      return patchRule(rulesClient, patchRulePayload, mlAuthz);
    },

    deleteRule: async (deleteRulePayload: DeleteRuleProps): Promise<void> => {
      return deleteRule(rulesClient, deleteRulePayload);
    },

    upgradePrebuiltRule: async (
      upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps
    ): Promise<RuleAlertType> => {
      return upgradePrebuiltRule(rulesClient, upgradePrebuiltRulePayload, mlAuthz);
    },

    importRule: async (importRulePayload: ImportRuleProps): Promise<RuleAlertType> => {
      return importRule(rulesClient, importRulePayload, mlAuthz);
    },
  };

  return client;
};

export const createCustomRule = async (
  rulesClient: RulesClient,
  createCustomRulePayload: CreateCustomRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { params } = createCustomRulePayload;
  await _validateMlAuth(mlAuthz, params.type);

  const rule = await _createRule(rulesClient, params, { immutable: false });
  return rule;
};

export const createPrebuiltRule = async (
  rulesClient: RulesClient,
  createPrebuiltRulePayload: CreatePrebuiltRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { ruleAsset } = createPrebuiltRulePayload;

  await _validateMlAuth(mlAuthz, ruleAsset.type);

  const rule = await _createRule(rulesClient, ruleAsset, {
    immutable: true,
    defaultEnabled: false,
  });

  return rule;
};

export const updateRule = async (
  rulesClient: RulesClient,
  updateRulePayload: UpdateRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { ruleUpdate } = updateRulePayload;
  const { rule_id: ruleId, id } = ruleUpdate;

  await _validateMlAuth(mlAuthz, ruleUpdate.type);

  const existingRule = await readRules({
    rulesClient,
    ruleId,
    id,
  });

  if (existingRule == null) {
    const error = getIdError({ id, ruleId });
    throw new ClientError(error.message, error.statusCode);
  }

  const update = await _updateRule(rulesClient, { ruleUpdate, existingRule });

  await _toggleRuleEnabledOnUpdate(rulesClient, existingRule, ruleUpdate.enabled);

  return { ...update, enabled: ruleUpdate.enabled ?? existingRule.enabled };
};

export const patchRule = async (
  rulesClient: RulesClient,
  patchRulePayload: PatchRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { nextParams } = patchRulePayload;
  const { rule_id: ruleId, id } = nextParams;

  const existingRule = await readRules({
    rulesClient,
    ruleId,
    id,
  });

  if (existingRule == null) {
    const error = getIdError({ id, ruleId });
    throw new ClientError(error.message, error.statusCode);
  }

  await _validateMlAuth(mlAuthz, nextParams.type ?? existingRule.params.type);

  const update = await _patchRule(rulesClient, { existingRule, nextParams });

  await _toggleRuleEnabledOnUpdate(rulesClient, existingRule, nextParams.enabled);

  if (nextParams.enabled != null) {
    return { ...update, enabled: nextParams.enabled };
  } else {
    return update;
  }
};

export const deleteRule = async (
  rulesClient: RulesClient,
  deleteRulePayload: DeleteRuleProps
): Promise<void> => {
  const { ruleId } = deleteRulePayload;
  await rulesClient.delete({ id: ruleId });
};

export const upgradePrebuiltRule = async (
  rulesClient: RulesClient,
  upgradePrebuiltRulePayload: UpgradePrebuiltRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { ruleAsset } = upgradePrebuiltRulePayload;

  await _validateMlAuth(mlAuthz, ruleAsset.type);

  const existingRule = await readRules({
    rulesClient,
    ruleId: ruleAsset.rule_id,
    id: undefined,
  });

  if (!existingRule) {
    throw new ClientError(`Failed to find rule ${ruleAsset.rule_id}`, 500);
  }

  // If rule has change its type during upgrade, delete and recreate it
  if (ruleAsset.type !== existingRule.params.type) {
    return _upgradePrebuiltRuleWithTypeChange(rulesClient, ruleAsset, existingRule);
  }

  // Else, simply patch it.
  await _patchRule(rulesClient, { existingRule, nextParams: ruleAsset });

  const updatedRule = await readRules({
    rulesClient,
    ruleId: ruleAsset.rule_id,
    id: undefined,
  });

  if (!updatedRule) {
    throw new ClientError(`Rule ${ruleAsset.rule_id} not found after upgrade`, 500);
  }

  return updatedRule;
};

export const importRule = async (
  rulesClient: RulesClient,
  importRulePayload: ImportRuleProps,
  mlAuthz: MlAuthz
): Promise<RuleAlertType> => {
  const { ruleToImport, overwriteRules, options } = importRulePayload;

  await _validateMlAuth(mlAuthz, ruleToImport.type);

  const existingRule = await readRules({
    rulesClient,
    ruleId: ruleToImport.rule_id,
    id: undefined,
  });

  if (!existingRule) {
    return _createRule(rulesClient, ruleToImport, {
      immutable: false,
      allowMissingConnectorSecrets: options?.allowMissingConnectorSecrets,
    });
  } else if (existingRule && overwriteRules) {
    return _updateRule(rulesClient, {
      existingRule,
      ruleUpdate: ruleToImport,
    });
  } else {
    throw createBulkErrorObject({
      ruleId: existingRule.params.ruleId,
      statusCode: 409,
      message: `rule_id: "${existingRule.params.ruleId}" already exists`,
    });
  }
};

/* -------- Internal Methods -------- */
const _createRule = async (
  rulesClient: RulesClient,
  params: RuleCreateProps,
  options: CreateRuleOptions
) => {
  const rulesClientCreateRuleOptions = options.id ? { id: options.id } : {};

  const internalRule = convertCreateAPIToInternalSchema(params, options);
  const rule = await rulesClient.create<RuleParams>({
    data: internalRule,
    options: rulesClientCreateRuleOptions,
    allowMissingConnectorSecrets: options.allowMissingConnectorSecrets,
  });

  return rule;
};

const _updateRule = async (
  rulesClient: RulesClient,
  updateRulePayload: _UpdateRuleProps
): Promise<RuleAlertType> => {
  const { ruleUpdate, existingRule } = updateRulePayload;

  const newInternalRule = convertUpdateAPIToInternalSchema({
    existingRule,
    ruleUpdate,
  });

  const update = await rulesClient.update({
    id: existingRule.id,
    data: newInternalRule,
  });

  return update;
};

const _patchRule = async (
  rulesClient: RulesClient,
  patchRulePayload: _PatchRuleProps
): Promise<RuleAlertType> => {
  const { nextParams, existingRule } = patchRulePayload;

  const patchedRule = convertPatchAPIToInternalSchema(nextParams, existingRule);

  const update = await rulesClient.update({
    id: existingRule.id,
    data: patchedRule,
  });

  return update;
};

const _upgradePrebuiltRuleWithTypeChange = async (
  rulesClient: RulesClient,
  ruleAsset: PrebuiltRuleAsset,
  existingRule: RuleAlertType
) => {
  // If we're trying to change the type of a prepackaged rule, we need to delete the old one
  // and replace it with the new rule, keeping the enabled setting, actions, throttle, id,
  // and exception lists from the old rule
  await rulesClient.delete({ id: existingRule.id });

  return _createRule(
    rulesClient,
    {
      ...ruleAsset,
      enabled: existingRule.enabled,
      exceptions_list: existingRule.params.exceptionsList,
      actions: existingRule.actions.map(transformAlertToRuleAction),
      timeline_id: existingRule.params.timelineId,
      timeline_title: existingRule.params.timelineTitle,
    },
    { immutable: true, defaultEnabled: existingRule.enabled, id: existingRule.id }
  );
};

const _toggleRuleEnabledOnUpdate = async (
  rulesClient: RulesClient,
  existingRule: RuleAlertType,
  updatedRuleEnabled?: boolean
) => {
  if (existingRule.enabled && updatedRuleEnabled === false) {
    await rulesClient.disable({ id: existingRule.id });
  } else if (!existingRule.enabled && updatedRuleEnabled === true) {
    await rulesClient.enable({ id: existingRule.id });
  }
};

const _validateMlAuth = async (mlAuthz: MlAuthz, ruleType: Type) => {
  throwAuthzError(await mlAuthz.validateRuleType(ruleType));
};
