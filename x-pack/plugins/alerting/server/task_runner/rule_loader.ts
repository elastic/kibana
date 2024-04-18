/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import {
  CoreKibanaRequest,
  FakeRawRequest,
  Headers,
  SavedObject,
  SavedObjectReference,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { createTaskRunError, TaskErrorSource } from '@kbn/task-manager-plugin/server';
import { RunRuleParams, TaskRunnerContext } from './types';
import { ErrorWithReason, validateRuleTypeParams } from '../lib';
import {
  RuleExecutionStatusErrorReasons,
  RawRule,
  RuleTypeRegistry,
  RuleTypeParamsValidator,
} from '../types';
import { MONITORING_HISTORY_LIMIT, RuleTypeParams } from '../../common';
import { RULE_SAVED_OBJECT_TYPE } from '../saved_objects';

interface RuleData {
  rawRule: RawRule;
  version: string | undefined;
  references: SavedObjectReference[];
}

interface ValidateRuleAndCreateFakeRequestParams<Params extends RuleTypeParams> {
  context: TaskRunnerContext;
  paramValidator?: RuleTypeParamsValidator<Params>;
  ruleData: RuleData;
  ruleId: string;
  ruleTypeRegistry: RuleTypeRegistry;
  spaceId: string;
}

/**
 * With the decrypted rule saved object
 * - transform from domain model to application model (rule)
 * - create a fakeRequest object using the rule API key
 * - get an instance of the RulesClient using the fakeRequest
 */
export function validateRuleAndCreateFakeRequest<Params extends RuleTypeParams>(
  params: ValidateRuleAndCreateFakeRequestParams<Params>
): RunRuleParams<Params> {
  const {
    context,
    paramValidator,
    ruleData: { rawRule, references, version },
    ruleId,
    ruleTypeRegistry,
    spaceId,
  } = params;

  const { enabled, apiKey, alertTypeId: ruleTypeId } = rawRule;

  if (!enabled) {
    throw createTaskRunError(
      new ErrorWithReason(
        RuleExecutionStatusErrorReasons.Disabled,
        new Error(`Rule failed to execute because rule ran after it was disabled.`)
      ),
      TaskErrorSource.FRAMEWORK
    );
  }

  const fakeRequest = getFakeKibanaRequest(context, spaceId, apiKey);
  const rulesClient = context.getRulesClientWithRequest(fakeRequest);
  const rule = rulesClient.getAlertFromRaw({
    id: ruleId,
    ruleTypeId,
    rawRule,
    references,
    includeLegacyId: false,
    omitGeneratedValues: false,
  });

  try {
    ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
  } catch (err) {
    throw createTaskRunError(
      new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err),
      TaskErrorSource.USER
    );
  }

  let validatedParams: Params;
  try {
    validatedParams = validateRuleTypeParams<Params>(rule.params, paramValidator);
  } catch (err) {
    throw createTaskRunError(
      new ErrorWithReason(RuleExecutionStatusErrorReasons.Validate, err),
      TaskErrorSource.USER
    );
  }

  if (rule.monitoring) {
    if (rule.monitoring.run.history.length >= MONITORING_HISTORY_LIMIT) {
      // Remove the first (oldest) record
      rule.monitoring.run.history.shift();
    }
  }

  return {
    apiKey,
    fakeRequest,
    rule,
    rulesClient,
    validatedParams,
    version,
  };
}

/**
 * Loads the decrypted rule saved object
 */
export async function getDecryptedRule(
  context: TaskRunnerContext,
  ruleId: string,
  spaceId: string
): Promise<RuleData> {
  const namespace = context.spaceIdToNamespace(spaceId);

  let rawRule: SavedObject<RawRule>;

  try {
    rawRule = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
      RULE_SAVED_OBJECT_TYPE,
      ruleId,
      { namespace }
    );
  } catch (e) {
    const error = new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, e);
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      throw createTaskRunError(error, TaskErrorSource.USER);
    }
    throw createTaskRunError(error, TaskErrorSource.FRAMEWORK);
  }

  return {
    version: rawRule.version,
    rawRule: rawRule.attributes,
    references: rawRule.references,
  };
}

export function getFakeKibanaRequest(
  context: TaskRunnerContext,
  spaceId: string,
  apiKey: RawRule['apiKey']
) {
  const requestHeaders: Headers = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);

  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  const fakeRequest = CoreKibanaRequest.from(fakeRawRequest);
  context.basePathService.set(fakeRequest, path);

  return fakeRequest;
}
