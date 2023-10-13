/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { RuleAttributes } from '../../../../data/rule/types';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RuleTypeParams } from '../../../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { RulesClientContext } from '../../../../rules_client/types';
import { formatLegacyActions } from '../../../../rules_client/lib';
import { transformRuleAttributesToRuleDomain, transformRuleDomainToRule } from '../../transforms';
import { Rule } from '../../types';
import { ruleSchema } from '../../schemas';
import { resolveRuleParamsSchema } from './schemas';
import type { ResolvedSanitizedRule } from '../../../../types';

export interface ResolveParams {
  id: string;
}

export async function resolveRule<Params extends RuleTypeParams = never>(
  context: RulesClientContext,
  { id }: ResolveParams
): // TODO (http-versioning): This should be of type Rule, change this when all rule types are fixed
Promise<ResolvedSanitizedRule<Params>> {
  try {
    resolveRuleParamsSchema.validate({ id });
  } catch (error) {
    throw Boom.badRequest(`Error validating resolve params - ${error.message}`);
  }
  const { saved_object: result, ...resolveResponse } =
    await context.unsecuredSavedObjectsClient.resolve<RuleAttributes>('alert', id);
  try {
    await context.authorization.ensureAuthorized({
      ruleTypeId: result.attributes.alertTypeId,
      consumer: result.attributes.consumer,
      operation: ReadOperations.Get,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.RESOLVE,
        savedObject: { type: 'alert', id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.RESOLVE,
      savedObject: { type: 'alert', id },
    })
  );

  const ruleDomain = transformRuleAttributesToRuleDomain(result.attributes, {
    id: result.id,
    logger: context.logger,
    ruleType: context.ruleTypeRegistry.get(result.attributes.alertTypeId),
    references: result.references,
  });

  const rule = transformRuleDomainToRule(ruleDomain);

  try {
    ruleSchema.validate(rule);
  } catch (error) {
    throw Boom.badRequest(`Error validating resolve data - ${error.message}`);
  }

  // format legacy actions for SIEM rules
  if (result.attributes.consumer === AlertConsumers.SIEM) {
    // @ts-expect-error formatLegacyActions uses common Rule type instead of server; wontfix as this function is deprecated
    const [migratedRule] = await formatLegacyActions([rule], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    return {
      ...(migratedRule as Rule<never>),
      ...resolveResponse,
      // TODO (http-versioning): Remove this cast, this enables us to move forward
      // without fixing all of other solution types
    } as ResolvedSanitizedRule;
  }

  return {
    ...rule,
    ...resolveResponse,
    // TODO (http-versioning): Remove this cast, this enables us to move forward
    // without fixing all of other solution types
  } as ResolvedSanitizedRule;
}
