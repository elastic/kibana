/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';
import { IEventLogClient } from '../../../../../../event_log/server';

import {
  RuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../common/detection_engine/schemas/common';
import { GetAggregateRuleExecutionEventsResponse } from '../../../../../common/detection_engine/schemas/response';
import { invariant } from '../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import { GetAggregateExecutionEventsArgs } from '../client_for_routes/client_interface';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
  RuleExecutionLogAction,
} from './constants';
import {
  formatExecutionEventResponse,
  getExecutionEventAggregation,
} from './get_execution_event_aggregation';
import {
  EXECUTION_UUID_FIELD,
  ExecutionUuidAggResult,
} from './get_execution_event_aggregation/types';

export interface IEventLogReader {
  getAggregateExecutionEvents(
    args: GetAggregateExecutionEventsArgs
  ): Promise<GetAggregateRuleExecutionEventsResponse>;

  getLastStatusChanges(args: GetLastStatusChangesArgs): Promise<RuleExecutionEvent[]>;
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
      const { ruleId, start, end, statusFilters, page, perPage, sortField, sortOrder } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];

      // Current workaround to support root level filters without missing fields in the aggregate event
      // or including events from statuses that aren't selected
      // TODO: See: https://github.com/elastic/kibana/pull/127339/files#r825240516
      // First fetch execution uuid's by status filter if provided
      let statusIds: string[] = [];
      let totalExecutions: number | undefined;
      // If 0 or 3 statuses are selected we can search for all statuses and don't need this pre-filter by ID
      if (statusFilters.length > 0 && statusFilters.length < 3) {
        const statusResults = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
          start,
          end,
          filter: `kibana.alert.rule.execution.status:(${statusFilters.join(' OR ')})`,
          aggs: {
            totalExecutions: {
              cardinality: {
                field: EXECUTION_UUID_FIELD,
              },
            },
            filteredExecutionUUIDs: {
              terms: {
                field: EXECUTION_UUID_FIELD,
                size: MAX_EXECUTION_EVENTS_DISPLAYED,
              },
            },
          },
        });
        const filteredExecutionUUIDs = statusResults.aggregations
          ?.filteredExecutionUUIDs as ExecutionUuidAggResult;
        statusIds = filteredExecutionUUIDs?.buckets?.map((b) => b.key) ?? [];
        totalExecutions = (
          statusResults.aggregations?.totalExecutions as estypes.AggregationsCardinalityAggregate
        ).value;
        // Early return if no results based on status filter
        if (statusIds.length === 0) {
          return {
            total: 0,
            events: [],
          };
        }
      }

      // Now query for aggregate events, and pass any ID's as filters as determined from the above status/queryText results
      const idsFilter = statusIds.length
        ? `kibana.alert.rule.execution.uuid:(${statusIds.join(' OR ')})`
        : '';
      const results = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
        start,
        end,
        filter: idsFilter,
        aggs: getExecutionEventAggregation({
          maxExecutions: MAX_EXECUTION_EVENTS_DISPLAYED,
          page,
          perPage,
          sort: [{ [sortField]: { order: sortOrder } }] as estypes.Sort,
        }),
      });

      return formatExecutionEventResponse(results, totalExecutions);
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
