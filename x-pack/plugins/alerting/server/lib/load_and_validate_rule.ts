/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Request } from '@hapi/hapi';
import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { KibanaRequest } from '@kbn/core/server';
import type { IBasePath } from '@kbn/core/server';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import { PublicMethodsOf } from '@kbn/utility-types';
import { ErrorWithReason, validateRuleTypeParams } from '.';
import {
  RuleTypeParams,
  RuleTypeState,
  AlertInstanceState,
  AlertInstanceContext,
  RulesClient,
} from '..';
import { RawRule, RuleExecutionStatusErrorReasons, SanitizedRule } from '../types';
import { TaskRunnerContext } from '../task_runner/task_runner_factory';
import { NormalizedRuleType } from '../rule_type_registry';

export interface LoadAndValidateOpts<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  context: TaskRunnerContext;
  ruleId: string;
  spaceId: string;
  namespace: string | undefined;
  ruleType: NormalizedRuleType<
    Params,
    ExtractedParams,
    State,
    InstanceState,
    InstanceContext,
    ActionGroupIds,
    RecoveryActionGroupId
  >;
}

export interface LoadAndValidateOutput<Params extends RuleTypeParams> {
  rule: SanitizedRule<Params>;
  apiKey: string | null;
  fakeRequest: KibanaRequest;
  rulesClient: PublicMethodsOf<RulesClient>;
  validatedParams: Params;
}

export async function loadAndValidateRule<
  Params extends RuleTypeParams,
  ExtractedParams extends RuleTypeParams,
  State extends RuleTypeState,
  InstanceState extends AlertInstanceState,
  InstanceContext extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  ruleId,
  spaceId,
  namespace,
  context,
  ruleType,
}: LoadAndValidateOpts<
  Params,
  ExtractedParams,
  State,
  InstanceState,
  InstanceContext,
  ActionGroupIds,
  RecoveryActionGroupId
>): Promise<LoadAndValidateOutput<Params>> {
  // Try to decrypt
  let enabled: boolean;
  let apiKey: string | null;
  try {
    const decryptedAttributes = await getDecryptedAttributes(
      ruleId,
      namespace,
      context.encryptedSavedObjectsClient
    );
    apiKey = decryptedAttributes.apiKey;
    enabled = decryptedAttributes.enabled;
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Decrypt, err);
  }

  // Check whether rule has been disabled after execution has started
  if (!enabled) {
    throw new ErrorWithReason(
      RuleExecutionStatusErrorReasons.Disabled,
      new Error(`Rule failed to execute because rule ran after it was disabled.`)
    );
  }

  const fakeRequest = getFakeKibanaRequest(spaceId, apiKey, context.basePathService);

  // Get rules client with space level permissions
  const rulesClient = context.getRulesClientWithRequest(fakeRequest);

  let rule: SanitizedRule<Params>;

  // Retrieve the rule using rules client to respect RBAC
  try {
    rule = await rulesClient.get({ id: ruleId });
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, err);
  }

  // Ensure rule type is enabled
  try {
    context.ruleTypeRegistry.ensureRuleTypeEnabled(rule.alertTypeId);
  } catch (err) {
    throw new ErrorWithReason(RuleExecutionStatusErrorReasons.License, err);
  }

  // Validate
  const validatedParams = validateRuleTypeParams(rule.params, ruleType.validate?.params);
  return { rule, apiKey, fakeRequest, rulesClient, validatedParams };
}

async function getDecryptedAttributes(
  ruleId: string,
  namespace: string | undefined,
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient
): Promise<{ apiKey: string | null; enabled: boolean; consumer: string }> {
  // Only fetch encrypted attributes here, we'll create a saved objects client
  // scoped with the API key to fetch the remaining data.
  const {
    attributes: { apiKey, enabled, consumer },
  } = await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawRule>('alert', ruleId, {
    namespace,
  });

  return { apiKey, enabled, consumer };
}

function getFakeKibanaRequest(
  spaceId: string,
  apiKey: RawRule['apiKey'],
  basePathService: IBasePath
) {
  const requestHeaders: Record<string, string> = {};

  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }

  const path = addSpaceIdToPath('/', spaceId);

  const fakeRequest = KibanaRequest.from({
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

  basePathService.set(fakeRequest, path);

  return fakeRequest;
}
