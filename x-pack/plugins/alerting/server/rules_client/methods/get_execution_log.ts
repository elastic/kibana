/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { KueryNode } from '@kbn/es-query';
import { SanitizedRuleWithLegacyId } from '../../types';
import {
  ReadOperations,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '../../authorization';
import { ruleAuditEvent, RuleAuditAction } from '../common/audit_events';
import {
  formatExecutionLogResult,
  getExecutionLogAggregation,
} from '../../lib/get_execution_log_aggregation';
import { IExecutionLogResult } from '../../../common';
import { parseDate } from '../common';
import { RulesClientContext } from '../types';
import { getRule } from '../../application/rule/methods/get/get_rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export interface GetExecutionLogByIdParams {
  id: string;
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
}

export interface GetGlobalExecutionLogParams {
  dateStart: string;
  dateEnd?: string;
  filter?: string;
  page: number;
  perPage: number;
  sort: estypes.Sort;
  namespaces?: Array<string | undefined>;
}

export async function getExecutionLogForRule(
  context: RulesClientContext,
  { id, dateStart, dateEnd, filter, page, perPage, sort }: GetExecutionLogByIdParams
): Promise<IExecutionLogResult> {
  context.logger.debug(`getExecutionLogForRule(): getting execution log for rule ${id}`);
  const rule = (await getRule(context, { id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

  try {
    // Make sure user has access to this rule
    await context.authorization.ensureAuthorized({
      ruleTypeId: rule.alertTypeId,
      consumer: rule.consumer,
      operation: ReadOperations.GetExecutionLog,
      entity: AlertingAuthorizationEntity.Rule,
    });
  } catch (error) {
    context.auditLogger?.log(
      ruleAuditEvent({
        action: RuleAuditAction.GET_EXECUTION_LOG,
        savedObject: { type: RULE_SAVED_OBJECT_TYPE, id, name: rule.name },
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_EXECUTION_LOG,
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
        aggs: getExecutionLogAggregation({
          filter,
          page,
          perPage,
          sort,
        }),
      },
      rule.legacyId !== null ? [rule.legacyId] : undefined
    );

    return formatExecutionLogResult(aggResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getExecutionLogForRule(): error searching event log for rule ${id}: ${err.message}`
    );
    throw err;
  }
}

export async function getGlobalExecutionLogWithAuth(
  context: RulesClientContext,
  { dateStart, dateEnd, filter, page, perPage, sort, namespaces }: GetGlobalExecutionLogParams
): Promise<IExecutionLogResult> {
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
        action: RuleAuditAction.GET_GLOBAL_EXECUTION_LOG,
        error,
      })
    );
    throw error;
  }

  context.auditLogger?.log(
    ruleAuditEvent({
      action: RuleAuditAction.GET_GLOBAL_EXECUTION_LOG,
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
        aggs: getExecutionLogAggregation({
          filter,
          page,
          perPage,
          sort,
        }),
      },
      namespaces
    );

    return formatExecutionLogResult(aggResult);
  } catch (err) {
    context.logger.debug(
      `rulesClient.getGlobalExecutionLogWithAuth(): error searching global event log: ${err.message}`
    );
    throw err;
  }
}
