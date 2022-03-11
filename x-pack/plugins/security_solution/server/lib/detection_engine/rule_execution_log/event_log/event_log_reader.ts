/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { get, set } from 'lodash';
import { IEventLogClient } from '../../../../../../event_log/server';

import {
  AggregateRuleExecutionEvent,
  RuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../common/detection_engine/schemas/common';
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';
import { invariant } from '../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
  RuleExecutionLogAction,
} from './constants';

export interface IEventLogReader {
  getAggregateExecutionEvents(
    args: GetAggregateExecutionEventsArgs
  ): Promise<GetAggregateRuleExecutionEventsResponse>;

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

// TODO: Hoist to package and share with UI in execution_log_table
const MAX_EXECUTION_EVENTS_DISPLAYED = 500;

export const createEventLogReader = (eventLog: IEventLogClient): IEventLogReader => {
  return {
    async getAggregateExecutionEvents(
      args: GetAggregateExecutionEventsArgs
    ): Promise<GetAggregateRuleExecutionEventsResponse> {
      const { ruleId, start, end, filters } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];
      const startDate = dateMath.parse(start);
      const endDate = dateMath.parse(end, { roundUp: true });

      invariant(startDate?.isValid(), `Required "start" field is not valid: ${start}`);
      invariant(endDate?.isValid(), `Required "end" field is not valid: ${end}`);

      // Fetch total unique executions per daterange to get max execution events
      const { total: uniqueExecutionEventsResults = 0 } = await eventLog.findEventsBySavedObjectIds(
        soType,
        soIds,
        {
          start: startDate?.utc().toISOString(),
          end: endDate?.utc().toISOString(),
          page: 1,
          per_page: 0,
          sort_field: '@timestamp',
          sort_order: 'desc',
          filter: `event.action:execute-start`,
        }
      );

      // Fetch all events to aggregate into individual execution events for each unique executionId
      const findResult = await eventLog.findEventsBySavedObjectIds(soType, soIds, {
        start: startDate?.utc().toISOString(),
        end: endDate?.utc().toISOString(),
        page: 1,
        per_page: 10000, // TODO: Possibly constrain to 5x MAX_EXECUTION_EVENTS_DISPLAYED (i.e. max events per execution)
        sort_field: '@timestamp',
        sort_order: 'desc',
        filter: filters,
      });

      const executeStartFields = ['@timestamp'];
      const executeFields = ['kibana.task.schedule_delay', 'event.duration'];
      const metricsFields = [
        'kibana.alert.rule.execution.metrics.execution_gap_duration_s',
        'kibana.alert.rule.execution.metrics.total_indexing_duration_ms',
        'kibana.alert.rule.execution.metrics.total_search_duration_ms',
      ];

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

        // Merge different event types into a single execution event.
        // @timestamp comes from initial `execute-start` event from platform
        // Remaining fields filled in from platform `execute` and security `metric`/`status-change` events
        if (eventAction === 'execute-start') {
          executeStartFields.forEach((field) => {
            set(aggregatedResults[uuid], field, get(event, field));
          });
        } else if (eventAction === 'execute') {
          executeFields.forEach((field) => {
            set(aggregatedResults[uuid], field, get(event, field));
          });
        } else if (eventAction === 'execution-metrics') {
          metricsFields.forEach((field) => {
            set(aggregatedResults[uuid], field, get(event, field));
          });
        } else if (eventAction === 'status-change' && status !== 'running') {
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

      const aggEvents = Object.values(aggregatedResults);
      // Constrain length as not supporting pagination through in-memory aggregations in MVP
      if (aggEvents.length > MAX_EXECUTION_EVENTS_DISPLAYED) {
        aggEvents.length = MAX_EXECUTION_EVENTS_DISPLAYED;
      }

      return {
        events: aggEvents as AggregateRuleExecutionEvent[],
        maxEvents: uniqueExecutionEventsResults,
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

      const findResult = await withSecuritySpan('findEventsBySavedObjectIds', () => {
        return eventLog.findEventsBySavedObjectIds(soType, soIds, {
          page: 1,
          per_page: count,
          sort: [{ sort_field: '@timestamp', sort_order: 'desc' }],
          filter: kqlFilter,
        });
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
