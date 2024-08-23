/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEvent } from '@kbn/event-log-plugin/server';
import { AlertSummary, SanitizedRuleWithLegacyId } from '../../types';
import { ReadOperations, AlertingAuthorizationEntity } from '../../authorization';
import { alertSummaryFromEventLog } from '../../lib/alert_summary_from_event_log';
import { parseDuration } from '../../../common/parse_duration';
import { parseDate } from '../common';
import { RulesClientContext } from '../types';
import { getRule } from '../../application/rule/methods/get/get_rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

export interface GetAlertSummaryParams {
  id: string;
  dateStart?: string;
  numberOfExecutions?: number;
}

export async function getAlertSummary(
  context: RulesClientContext,
  { id, dateStart, numberOfExecutions }: GetAlertSummaryParams
): Promise<AlertSummary> {
  context.logger.debug(`getAlertSummary(): getting alert ${id}`);
  const rule = (await getRule(context, { id, includeLegacyId: true })) as SanitizedRuleWithLegacyId;

  await context.authorization.ensureAuthorized({
    ruleTypeId: rule.alertTypeId,
    consumer: rule.consumer,
    operation: ReadOperations.GetAlertSummary,
    entity: AlertingAuthorizationEntity.Rule,
  });

  const dateNow = new Date();
  const durationMillis = parseDuration(rule.schedule.interval) * (numberOfExecutions ?? 60);
  const defaultDateStart = new Date(dateNow.valueOf() - durationMillis);
  const parsedDateStart = parseDate(dateStart, 'dateStart', defaultDateStart);

  const eventLogClient = await context.getEventLogClient();

  context.logger.debug(`getAlertSummary(): search the event log for rule ${id}`);
  let events: IEvent[];
  let executionEvents: IEvent[];

  try {
    const [queryResults, executionResults] = await Promise.all([
      eventLogClient.findEventsBySavedObjectIds(
        RULE_SAVED_OBJECT_TYPE,
        [id],
        {
          page: 1,
          per_page: 10000,
          start: parsedDateStart.toISOString(),
          sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
          end: dateNow.toISOString(),
          // filter out execute-action event logs
          filter: 'NOT event.action: execute-action AND event.provider: alerting',
        },
        rule.legacyId !== null ? [rule.legacyId] : undefined
      ),
      eventLogClient.findEventsBySavedObjectIds(
        RULE_SAVED_OBJECT_TYPE,
        [id],
        {
          page: 1,
          per_page: numberOfExecutions ?? 60,
          filter: 'event.provider: alerting AND event.action:execute',
          sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
          end: dateNow.toISOString(),
        },
        rule.legacyId !== null ? [rule.legacyId] : undefined
      ),
    ]);
    events = queryResults.data;
    executionEvents = executionResults.data;
  } catch (err) {
    context.logger.debug(
      `rulesClient.getAlertSummary(): error searching event log for rule ${id}: ${err.message}`
    );
    events = [];
    executionEvents = [];
  }

  return alertSummaryFromEventLog({
    rule,
    events,
    executionEvents,
    dateStart: parsedDateStart.toISOString(),
    dateEnd: dateNow.toISOString(),
  });
}
