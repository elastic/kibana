/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@elastic/datemath';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import { IEventLogClient } from '../../../../../../event_log/server';

import {
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
import {
  formatExecutionEventResponse,
  getExecutionEventAggregation,
} from './get_execution_event_aggregation';
import { ExecutionUuidAggResult } from './get_execution_event_aggregation/types';

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
  queryText: string;
  statusFilters: string[];
}

export interface GetLastStatusChangesArgs {
  ruleId: string;
  count: number;
  includeStatuses?: RuleExecutionStatus[];
}

export const createEventLogReader = (eventLog: IEventLogClient): IEventLogReader => {
  return {
    async getAggregateExecutionEvents(
      args: GetAggregateExecutionEventsArgs
    ): Promise<GetAggregateRuleExecutionEventsResponse> {
      const { ruleId, start, end, queryText, statusFilters } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];
      const startDate = dateMath.parse(start);
      const endDate = dateMath.parse(end, { roundUp: true });

      invariant(startDate?.isValid(), `Required "start" field is not valid: ${start}`);
      invariant(endDate?.isValid(), `Required "end" field is not valid: ${end}`);

      const filterString = statusFilters.length
        ? `kibana.alert.rule.execution.status:(${statusFilters.join(' OR ')})`
        : '';
      const filter = queryText.length ? `${queryText} AND ${filterString}` : filterString;

      let idsFilter = '';
      if (filter.length) {
        // TODO: Current workaround to support root level filters without missing fields in the aggregate event
        // TODO: See: https://github.com/elastic/kibana/pull/127339/files#r825240516
        const filteredResults = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
          start: startDate?.utc().toISOString(),
          end: endDate?.utc().toISOString(),
          filter,
          aggs: {
            filteredExecutionUUIDs: {
              terms: {
                field: 'kibana.alert.rule.execution.uuid',
                size: MAX_EXECUTION_EVENTS_DISPLAYED,
              },
            },
          },
        });
        const filteredExecutionUUIDs = filteredResults.aggregations
          ?.filteredExecutionUUIDs as ExecutionUuidAggResult;
        const filteredIds = filteredExecutionUUIDs?.buckets?.map((b) => b.key) ?? [];
        idsFilter = filteredIds.length
          ? `kibana.alert.rule.execution.uuid:(${filteredIds.join(' OR ')})`
          : '';
      }

      const results = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
        start: startDate?.utc().toISOString(), // TODO: Is there a way to get typescript to know startDate isn't null based on the above invariant?
        end: endDate?.utc().toISOString(),
        filter: idsFilter,
        aggs: getExecutionEventAggregation({
          maxExecutions: MAX_EXECUTION_EVENTS_DISPLAYED,
          page: 1,
          perPage: 10,
          sort: [{ timestamp: { order: 'desc' } }],
        }),
      });

      return formatExecutionEventResponse(results);
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
