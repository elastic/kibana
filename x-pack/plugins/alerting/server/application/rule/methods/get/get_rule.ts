/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { AlertConsumers } from '@kbn/rule-data-utils';
import {
  SanitizedRule,
  SanitizedRuleWithLegacyId,
  Rule as DeprecatedRule,
} from '../../../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../rules_client/common/audit_events';
import { RulesClientContext } from '../../../../rules_client/types';
import { formatLegacyActions } from '../../../../rules_client/lib';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { GetRuleParams } from './types';
import { getRuleParamsSchema } from './schemas';
import { getRuleSo } from '../../../../data/rule';
import { transformRuleAttributesToRuleDomain, transformRuleDomainToRule } from '../../transforms';
import { RuleParams } from '../../types';
import { ruleDomainSchema } from '../../schemas';

export async function getRule<Params extends RuleParams = never>(
  context: RulesClientContext,
  params: GetRuleParams
): Promise<SanitizedRule<Params> | SanitizedRuleWithLegacyId<Params>> {
  const {
    id,
    includeLegacyId = false,
    includeSnoozeData = false,
    excludeFromPublicApi = false,
  } = params;

  try {
    getRuleParamsSchema.validate(params);
  } catch (error) {
    throw Boom.badRequest(`Error validating get data - ${error.message}`);
  }

  const result = await getRuleSo({
    savedObjectsClient: context.unsecuredSavedObjectsClient,
    id,
  });

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
        action: RuleAuditAction.GET,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
        error,
      })
    );
    throw error;
  }
  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id },
    })
  );

  const ruleType = context.ruleTypeRegistry.get(result.attributes.alertTypeId);

  const ruleDomain = transformRuleAttributesToRuleDomain<Params>(
    result.attributes,
    {
      id: result.id,
      logger: context.logger,
      ruleType,
      references: result.references,
      includeSnoozeData,
    },
    context.isSystemAction
  );

  // Try to validate created rule, but don't throw.
  try {
    ruleDomainSchema.validate(ruleDomain);
  } catch (e) {
    context.logger.warn(`Error validating get rule domain object for id: ${id}, ${e}`);
  }

  // Convert domain rule to rule (Remove certain properties)
  const rule = transformRuleDomainToRule<Params>(ruleDomain, {
    isPublic: excludeFromPublicApi,
    includeLegacyId,
  });

  // format legacy actions for SIEM rules
  if (result.attributes.consumer === AlertConsumers.SIEM) {
    const [migratedRule] = await formatLegacyActions([rule as DeprecatedRule], {
      savedObjectsClient: context.unsecuredSavedObjectsClient,
      logger: context.logger,
    });

    return migratedRule;
  }

  // TODO (http-versioning): Remove this cast, this enables us to move forward
  // without fixing all of other solution types
  return rule as SanitizedRule<Params>;
}
