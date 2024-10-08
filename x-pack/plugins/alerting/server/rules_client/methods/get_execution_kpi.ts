/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import { SanitizedRuleWithLegacyId } from '../../types';
import {
  ReadOperations,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  formatExecutionKPIResult,
  getExecutionKPIAggregation,
} from '../../lib/get_execution_log_aggregation';
import { RulesClientContext } from '../types';
import { parseDate } from '../common';
import { getRule } from '../../application/rule/methods/get/get_rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export interface GetRuleExecutionKPIParams {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string;
}

export interface GetGlobalExecutionKPIParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  namespaces?: Array<string | undefined>;
}

export async function getRuleExecutionKPI(
  context: RulesClientContext,
  { id, dateStart, dateEnd, filter }: GetRuleExecutionKPIParams
) {
  context.logger.debug(`getRuleExecutionKPI(): getting execution KPI for rule ${id}`);
  const rule = (await getRule(context, { id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

  try {
    // Make sure user has access to this rule
    await context.authorization.ensureAuthorized({
      ruleTypeId: rule.alertTypeId,
      consumer: rule.consumer,
      operation: ReadOperations.GetRuleExecutionKPI,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_RULE_EXECUTION_KPI,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: rule.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_RULE_EXECUTION_KPI,
      savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: rule.name },
    })
  );

  // default duration of instance summary is 60 * rule interval
  const dateNow = new Date();
  const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
  const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

  const eventLogClient = await context.getEventLogClient();

  try {
    const aggResult = await eventLogClient.aggregateEventsBySavedObjectIds(
      RULE_SAVED_OBJECT_TYPE,
      [id],
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        aggs: getExecutionKPIAggregation(filter),
      },
      rule.legacyId !== null ? [rule.legacyId] : undefined
    );

    return formatExecutionKPIResult(aggResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getRuleExecutionKPI(): error searching execution KPI for rule ${id}: ${err.message}`
    );
    throw err;
  }
}

export async function getGlobalExecutionKpiWithAuth(
  context: RulesClientContext,
  { dateStart, dateEnd, filter, namespaces }: GetGlobalExecutionKPIParams
) {
  context.logger.debug(`getGlobalExecutionLogWithAuth(): getting global execution log`);

  let authorizationTuple;
  try {
    authorizationTuple = await context.authorization.getFindAuthorizationFilter(
      AlertingAuthorizationEntity.Alert,
      {
        type: AlertingAuthorizationFilterType.KQL,
        fieldNames: {
          ruleTypeId: 'kibana.alert.rule.rule_type_id',
          consumer: 'kibana.alert.rule.consumer',
        },
      }
    );
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_GLOBAL_EXECUTION_KPI,
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_GLOBAL_EXECUTION_KPI,
    })
  );

  const dateNow = new Date();
  const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
  const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

  const eventLogClient = await context.getEventLogClient();

  try {
    const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
      RULE_SAVED_OBJECT_TYPE,
      authorizationTuple.filter as KueryNode,
      {
        start: parsedDateStart.toISOString(),
        end: parsedDateEnd.toISOString(),
        aggs: getExecutionKPIAggregation(filter),
      },
      namespaces
    );

    return formatExecutionKPIResult(aggResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getGlobalExecutionKpiWithAuth(): error searching global execution KPI: ${err.message}`
    );
    throw err;
  }
}
