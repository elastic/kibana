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

  try {
    const decryptedAttributes = await getDecryptedAttributes(context, ruleId, spaceId);
    apiKey = decryptedAttributes.apiKey;
    enabled = decryptedAttributes.enabled;
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, err);
  }

  if (!enabled) {
    throw new ErrorWithReason(
      RuleExecutionStatusErrorReasons.Disabled,
      new Error(`Rule failed to execute because rule ran after it was disabled.`)
    );
  }

  const fakeRequest = getFakeKibanaRequest(context, spaceId, apiKey);
  const rulesClient = context.getRulesClientWithRequest(fakeRequest);

  let rule: SanitizedRule<Params>;

  // Ensure API key is still valid and user has access
  try {
    rule = await rulesClient.get<Params>({ id: ruleId });
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, err);
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

export async function getDecryptedAttributes(
  context: TaskRunnerContext,
  ruleId: string,
  spaceId: string
): Promise<{ apiKey: string | null; enabled: boolean; consumer: string }> {
  const namespace = context.spaceIdToNamespace(spaceId);

  // Only fetch encrypted attributes here, we'll create a saved objects client
  // scoped with the API key to fetch the remaining data.
  const {
    attributes: { apiKey, enabled, consumer },
  } = await context.encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>(
    'alert',
    ruleId,
    { namespace }
  );

  return { apiKey, enabled, consumer };
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
