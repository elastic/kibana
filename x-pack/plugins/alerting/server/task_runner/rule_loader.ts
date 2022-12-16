/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import type { Request } from '@hapi/hapi';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { CoreKibanaRequest } from '@kbn/core/server';
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

export interface LoadRuleParams<Params extends RuleTypeParams> {
  paramValidator?: RuleTypeParamsValidator<Params>;
  ruleId: string;
  spaceId: string;
  context: TaskRunnerContext;
  ruleTypeRegistry: RuleTypeRegistry;
  alertingEventLogger: PublicMethodsOf<AlertingEventLogger>;
}

export async function loadRule<Params extends RuleTypeParams>(params: LoadRuleParams<Params>) {
  const { paramValidator, ruleId, spaceId, context, ruleTypeRegistry, alertingEventLogger } =
    params;
  let enabled: boolean;
  let apiKey: string | null;
  let rule: SanitizedRule<Params>;
  let fakeRequest: CoreKibanaRequest;
  let rulesClient: RulesClientApi;

  try {
    const attributes = await getRuleAttributes<Params>(context, ruleId, spaceId);
    apiKey = attributes.apiKey;
    enabled = attributes.enabled;
    rule = attributes.rule;
    fakeRequest = attributes.fakeRequest;
    rulesClient = attributes.rulesClient;
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, err);
  }

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
    fakeRequest,
    apiKey,
    rulesClient,
    validatedParams,
  };
}

export async function getRuleAttributes<Params extends RuleTypeParams>(
  context: TaskRunnerContext,
  ruleId: string,
  spaceId: string
): Promise<{
  apiKey: string | null;
  enabled: boolean;
  consumer: string;
  rule: SanitizedRule<Params>;
  fakeRequest: CoreKibanaRequest;
  rulesClient: RulesClientApi;
}> {
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
  });

  return {
    rule,
    apiKey: rawRule.attributes.apiKey,
    enabled: rawRule.attributes.enabled,
    consumer: rawRule.attributes.consumer,
    fakeRequest,
    rulesClient,
  };
}

export function getFakeKibanaRequest(
  context: TaskRunnerContext,
  spaceId: string,
  apiKey: RawRule['apiKey']
) {
  const requestHeaders: Record<string, string> = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);

  const fakeRequest = CoreKibanaRequest.from({
    headers: requestHeaders,
    path: '/',
    route: { settings: {} },
    url: {
      href: '/',
    },
    raw: {
      req: {
        url: '/',
      },
    },
  } as unknown as Request);

  context.basePathService.set(fakeRequest, path);

  return fakeRequest;
}
