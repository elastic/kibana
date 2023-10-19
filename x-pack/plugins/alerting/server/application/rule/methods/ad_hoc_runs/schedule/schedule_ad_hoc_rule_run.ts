/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { asyncForEach } from '@kbn/std';
import { parseDuration } from '@kbn/actions-plugin/server/lib/parse_date';
import { Rule } from '../../../../../types';
import { RulesClientContext } from '../../../../../rules_client';
import { ReadOperations, AlertingAuthorizationEntity } from '../../../../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../../../../../rules_client/common/audit_events';
import type { ScheduleAdHocRuleRunOptions } from './types';
import { scheduleAdHocRuleRunOptionsSchema } from './schemas';

export async function scheduleAdHocRuleRun(
  context: RulesClientContext,
  options: ScheduleAdHocRuleRunOptions
) {
  try {
    scheduleAdHocRuleRunOptionsSchema.validate(options);
  } catch (error) {
    throw Boom.badRequest(`Error validating schedule data - ${error.message}`);
  }

  // Verify valid duration
  try {
    parseDuration(options.intervalDuration);
  } catch (error) {
    throw Boom.badRequest(`Invalid intervalDuration - ${options.intervalDuration}`);
  }

  // Verify rule IDs are valid
  const bulkGetResult = await context.unsecuredSavedObjectsClient.bulkGet<Rule>(
    options.ruleIds.map((id: string) => ({ id, type: 'alert' }))
  );
  // Audit log the GET
  bulkGetResult.saved_objects.forEach(({ id }) => {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET,
        savedObject: { type: 'alert', id },
      })
    );
  });
  // Throw if errors getting any rule
  for (const rule of bulkGetResult.saved_objects) {
    if (rule.error) {
      throw Boom.badRequest(
        `Failed to load rule ${rule.id} (${rule.error.statusCode}): ${rule.error.message}`
      );
    }
  }

  asyncForEach(bulkGetResult.saved_objects, async (rule) => {
    // Verify we have access to schedule an ad hoc run for each rule
    try {
      await context.authorization.ensureAuthorized({
        ruleTypeId: rule.attributes.alertTypeId,
        consumer: rule.attributes.consumer,
        operation: ReadOperations.ScheduleAdHocRuleRun,
        entity: AlertingAuthorizationEntity.Rule,
      });
    } catch (error) {
      context.auditLogger?.log(
        ruleAuditEvent({
          action: RuleAuditAction.SCHEDULE_AD_HOC_RULE_RUN,
          savedObject: { type: 'alert', id: rule.id },
          error,
        })
      );
      throw error;
    }
  });

  bulkGetResult.saved_objects.forEach((rule) => {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.SCHEDULE_AD_HOC_RULE_RUN,
        outcome: 'unknown',
        savedObject: { type: 'alert', id: rule.id },
      })
    );
    context.ruleTypeRegistry.ensureRuleTypeEnabled(rule.attributes.alertTypeId);
  });

  return context.adHocRuleRunClient.queue({ ...options, spaceId: context.spaceId });
}
