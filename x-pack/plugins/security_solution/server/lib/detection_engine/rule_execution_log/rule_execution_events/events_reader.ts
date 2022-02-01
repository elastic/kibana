/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { Logger } from 'src/core/server';
import { get, set } from 'lodash';
import { IEventLogClient } from '../../../../../../event_log/server';

import {
  RuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../common/detection_engine/schemas/common';
import { GetRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';
import { invariant } from '../../../../../common/utils/invariant';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
  RuleExecutionLogAction,
} from './constants';

export interface IRuleExecutionEventsReader {
  getAggregateExecutionEvents(
    args: GetAggregateExecutionEventsArgs
  ): Promise<GetRuleExecutionEventsResponse>;

  getLastStatusChanges(args: GetLastStatusChangesArgs): Promise<RuleExecutionEvent[]>;
}

export interface GetAggregateExecutionEventsArgs {
  ruleId: string;
  start: string;
  end: string;
  filters: string;
}

export interface GetLastStatusChangesArgs {
  ruleId: string;
  count: number;
  includeStatuses?: RuleExecutionStatus[];
}

export const createRuleExecutionEventsReader = (
  eventLogClient: IEventLogClient,
  logger: Logger
): IRuleExecutionEventsReader => {
  return {
    async getAggregateExecutionEvents(
      args: GetAggregateExecutionEventsArgs
    ): Promise<GetRuleExecutionEventsResponse> {
      const { ruleId, start, end, filters } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];
      const startDate = dateMath.parse(start);
      const endDate = dateMath.parse(end, { roundUp: true });

      invariant(startDate?.isValid(), `Required "start" field is not valid: ${start}`);
      invariant(endDate?.isValid(), `Required "end" field is not valid: ${end}`);

      // Fetch total unique executions per filters/daterange to get max execution events
      const { total: uniqueExecutionEventsResults = 0 } =
        await eventLogClient.findEventsBySavedObjectIds(soType, soIds, {
          start: startDate?.utc().toISOString(),
          end: endDate?.utc().toISOString(),
          page: 1,
          per_page: 0,
          sort_field: '@timestamp',
          sort_order: 'desc',
          filter: `event.action:execute-start `,
        });

      const findResult = await eventLogClient.findEventsBySavedObjectIds(soType, soIds, {
        start: startDate?.utc().toISOString(),
        end: endDate?.utc().toISOString(),
        page: 1,
        per_page: 10000,
        sort_field: '@timestamp',
        sort_order: 'desc',
        filter: filters,
      });

      // TODO: Rework to ensure all fields are included from necessary event types
      // Maybe use `objectArrayIntersection` from EQL sequence building?
      const aggregatedResults: Record<string, object> = {};
      findResult.data.forEach((event) => {
        const uuid: string = get(event, 'kibana.alert.rule.execution.uuid');
        const eventAction: string = get(event, 'event.action');
        const status = get(event, 'kibana.alert.rule.execution.status');
        if (aggregatedResults[uuid] == null) {
          aggregatedResults[uuid] = {};
        }

        if (eventAction === 'execute') {
          set(aggregatedResults[uuid], '@timestamp', get(event, '@timestamp'));
          set(
            aggregatedResults[uuid],
            'kibana.task.schedule_delay',
            get(event, 'kibana.task.schedule_delay')
          );
          set(aggregatedResults[uuid], 'event.duration', get(event, 'event.duration'));
        } else if (eventAction === 'execution-metrics') {
          set(
            aggregatedResults[uuid],
            'kibana.alert.rule.execution.metrics.total_alerts',
            get(event, 'kibana.alert.rule.execution.metrics.total_alerts')
          );
          set(
            aggregatedResults[uuid],
            'kibana.alert.rule.execution.metrics.total_hits',
            get(event, 'kibana.alert.rule.execution.metrics.total_hits')
          );
          set(
            aggregatedResults[uuid],
            'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
            get(event, 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms')
          );
          set(
            aggregatedResults[uuid],
            'kibana.alert.rule.execution.metrics.total_search_duration_ms',
            get(event, 'kibana.alert.rule.execution.metrics.total_search_duration_ms')
          );
          set(
            aggregatedResults[uuid],
            'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
            get(event, 'kibana.alert.rule.execution.metrics.total_indexing_duration_ms')
          );
        } else if (eventAction === 'status-change' && status !== 'going to run') {
          if (status != null) {
            set(aggregatedResults[uuid], 'kibana.alert.rule.execution.status', status);
          }
          const message = get(event, 'message');
          if (message != null) {
            // TODO: Append messages?
            set(aggregatedResults[uuid], 'message', message);
          }
        }
      });

      return {
        events: Object.values(aggregatedResults) as RuleExecutionEvent[],
        message: `${uniqueExecutionEventsResults}`,
      };
    },
    async getLastStatusChanges(args) {
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [args.ruleId];
      const count = args.count;
      const includeStatuses = (args.includeStatuses ?? []).map((status) => `"${status}"`);

      const filterBy: string[] = [
        `event.provider: ${RULE_EXECUTION_LOG_PROVIDER}`,
        'event.kind: event',
        `event.action: ${RuleExecutionLogAction['status-change']}`,
        includeStatuses.length > 0
          ? `kibana.alert.rule.execution.status:${includeStatuses.join(' ')}`
          : '',
      ];

      const kqlFilter = filterBy
        .filter(Boolean)
        .map((item) => `(${item})`)
        .join(' and ');

      const findResult = await eventLogClient.findEventsBySavedObjectIds(soType, soIds, {
        page: 1,
        per_page: count,
        sort_field: '@timestamp',
        sort_order: 'desc',
        filter: kqlFilter,
      });

      return findResult.data.map((event) => {
        invariant(event, 'Event not found');
        invariant(event['@timestamp'], 'Required "@timestamp" field is not found');
        invariant(
          event.kibana?.alert?.rule?.execution?.status,
          'Required "kibana.alert.rule.execution.status" field is not found'
        );

        const date = event['@timestamp'];
        const status = event.kibana?.alert?.rule?.execution?.status as RuleExecutionStatus;
        const message = event.message ?? '';
        const result: RuleExecutionEvent = {
          date,
          status,
          message,
        };

        return result;
      });
    },
  };
};
