/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { CoreKibanaRequest, FakeRawRequest, Headers } from '@kbn/core/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  LoadedIndirectParams,
  LoadIndirectParamsResult,
} from '@kbn/task-manager-plugin/server/task';
import { TaskRunnerContext } from './task_runner_factory';
import { ErrorWithReason, validateRuleTypeParams } from '../lib';
import {
  RuleExecutionStatusErrorReasons,
  RawRule,
  RuleTypeRegistry,
  RuleTypeParamsValidator,
  SanitizedRule,
  RulesClientApi,
} from '../types';
import { MONITORING_HISTORY_LIMIT, RuleTypeParams } from '../../common';
import { AlertingEventLogger } from '../lib/alerting_event_logger/alerting_event_logger';

export interface RuleData<Params extends RuleTypeParams> extends LoadedIndirectParams<RawRule> {
  indirectParams: RawRule;
  rule: SanitizedRule<Params>;
  version: string | undefined;
  fakeRequest: CoreKibanaRequest;
  rulesClient: RulesClientApi;
}

export type RuleDataResult<T extends LoadedIndirectParams> = LoadIndirectParamsResult<T>;

export interface ValidatedRuleData<Params extends RuleTypeParams> extends RuleData<Params> {
  validatedParams: Params;
  apiKey: string | null;
}

interface ValidateRuleParams<Params extends RuleTypeParams> {
  alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
  paramValidator?: RuleTypeParamsValidator<Params>;
  ruleId: string;
  spaceId: string;
  context: TaskRunnerContext;
  ruleTypeRegistry: RuleTypeRegistry;
  ruleData: RuleDataResult<RuleData<Params>>;
}

export function validateRule<Params extends RuleTypeParams>(
  params: ValidateRuleParams<Params>
): ValidatedRuleData<Params> {
  if (params.ruleData.error) {
    throw params.ruleData.error;
  }

  const {
    ruleData: {
      data: { indirectParams, rule, fakeRequest, rulesClient, version },
    },
    ruleTypeRegistry,
    paramValidator,
    alertingEventLogger,
  } = params;

  const { enabled, apiKey } = indirectParams;

  if (!enabled) {
    throw new ErrorWithReason(
      RuleExecutionStatusErrorReasons.Disabled,
      new Error(`Rule failed to execute because rule ran after it was disabled.`)
    );
  }
  alertingEventLogger.setRuleName(rule.name);
  try {
    ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err);
  }

  let validatedParams: Params;
  try {
    validatedParams = validateRuleTypeParams<Params>(rule.params, paramValidator);
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Validate, err);
  }

  if (rule.monitoring) {
    if (rule.monitoring.run.history.length >= MONITORING_HISTORY_LIMIT) {
      // Remove the first (oldest) record
      rule.monitoring.run.history.shift();
    }
  }

  return {
    rule,
    indirectParams,
    fakeRequest,
    apiKey,
    rulesClient,
    validatedParams,
    version,
  };
}

export async function getRuleAttributes<Params extends RuleTypeParams>(
  context: TaskRunnerContext,
  ruleId: string,
  spaceId: string
): Promise<RuleData<Params>> {
  const namespace = context.spaceIdToNamespace(spaceId);

  const rawRule = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
    'alert',
    ruleId,
    { namespace }
  );

  const fakeRequest = getFakeKibanaRequest(context, spaceId, rawRule.attributes.apiKey);
  const rulesClient = context.getRulesClientWithRequest(fakeRequest);
  const rule = rulesClient.getAlertFromRaw({
    id: ruleId,
    ruleTypeId: rawRule.attributes.alertTypeId as string,
    rawRule: rawRule.attributes as RawRule,
    references: rawRule.references,
    includeLegacyId: false,
    omitGeneratedValues: false,
  });

  return {
    rule,
    version: rawRule.version,
    indirectParams: rawRule.attributes,
    fakeRequest,
    rulesClient,
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
