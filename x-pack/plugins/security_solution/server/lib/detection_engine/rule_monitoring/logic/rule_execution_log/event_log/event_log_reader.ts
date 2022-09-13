/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { IEventLogClient, IValidatedEvent } from '@kbn/event-log-plugin/server';
import { MAX_EXECUTION_EVENTS_DISPLAYED } from '@kbn/securitysolution-rules';

import { assertUnreachable } from '../../../../../../../common/utility_types';
import { invariant } from '../../../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../../../utils/with_security_span';

import type {
  RuleExecutionEvent,
  GetRuleExecutionEventsResponse,
  GetRuleExecutionResultsResponse,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import {
  LogLevel,
  logLevelFromString,
  RuleExecutionEventType,
  ruleExecutionEventTypeFromString,
} from '../../../../../../../common/detection_engine/rule_monitoring';
import type {
  GetExecutionEventsArgs,
  GetExecutionResultsArgs,
} from '../client_for_routes/client_interface';

import { RULE_SAVED_OBJECT_TYPE, RULE_EXECUTION_LOG_PROVIDER } from './constants';
import {
  formatExecutionEventResponse,
  getExecutionEventAggregation,
  mapRuleExecutionStatusToPlatformStatus,
} from './get_execution_event_aggregation';
import type { ExecutionUuidAggResult } from './get_execution_event_aggregation/types';
import { EXECUTION_UUID_FIELD } from './get_execution_event_aggregation/types';

export interface IEventLogReader {
  getExecutionEvents(args: GetExecutionEventsArgs): Promise<GetRuleExecutionEventsResponse>;
  getExecutionResults(args: GetExecutionResultsArgs): Promise<GetRuleExecutionResultsResponse>;
}

export const createEventLogReader = (eventLog: IEventLogClient): IEventLogReader => {
  return {
    async getExecutionEvents(
      args: GetExecutionEventsArgs
    ): Promise<GetRuleExecutionEventsResponse> {
      const { ruleId, eventTypes, logLevels, sortOrder, page, perPage } = args;
      const soType = RULE_SAVED_OBJECT_TYPE;
      const soIds = [ruleId];

      // TODO: include Framework events
      const kqlFilter = kqlAnd([
        `event.provider:${RULE_EXECUTION_LOG_PROVIDER}`,
        eventTypes.length > 0 ? `event.action:(${kqlOr(eventTypes)})` : '',
        logLevels.length > 0 ? `log.level:(${kqlOr(logLevels)})` : '',
      ]);

      const findResult = await withSecuritySpan('findEventsBySavedObjectIds', () => {
        return eventLog.findEventsBySavedObjectIds(soType, soIds, {
          filter: kqlFilter,
          sort: [
            { sort_field: '@timestamp', sort_order: sortOrder },
            { sort_field: 'event.sequence', sort_order: sortOrder },
          ],
          page,
          per_page: perPage,
        });
      });

      return {
        events: findResult.data.map((event) => normalizeEvent(event)),
        pagination: {
          page: findResult.page,
          per_page: findResult.per_page,
          total: findResult.total,
        },
      };
    },

    async getExecutionResults(
      args: GetExecutionResultsArgs
    ): Promise<GetRuleExecutionResultsResponse> {
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
        const outcomes = mapRuleExecutionStatusToPlatformStatus(statusFilters);
        const outcomeFilter = outcomes.length ? `OR event.outcome:(${outcomes.join(' OR ')})` : '';
        const statusResults = await eventLog.aggregateEventsBySavedObjectIds(soType, soIds, {
          start,
          end,
          // Also query for `event.outcome` to catch executions that only contain platform events
          filter: `kibana.alert.rule.execution.status:(${statusFilters.join(
            ' OR '
          )}) ${outcomeFilter}`,
          aggs: {
            totalExecutions: {
              cardinality: {
                field: EXECUTION_UUID_FIELD,
              },
            },
            filteredExecutionUUIDs: {
              terms: {
                field: EXECUTION_UUID_FIELD,
                order: { executeStartTime: 'desc' },
                size: MAX_EXECUTION_EVENTS_DISPLAYED,
              },
              aggs: {
                executeStartTime: {
                  min: {
                    field: '@timestamp',
                  },
                },
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
          sort: [{ [sortField]: { order: sortOrder } }],
        }),
      });

      return formatExecutionEventResponse(results, totalExecutions);
    },
  };
};

const kqlAnd = <T>(items: T[]): string => {
  return items.filter(Boolean).map(String).join(' and ');
};

const kqlOr = <T>(items: T[]): string => {
  return items.filter(Boolean).map(String).join(' or ');
};

const normalizeEvent = (rawEvent: IValidatedEvent): RuleExecutionEvent => {
  invariant(rawEvent, 'Event not found');

  const timestamp = normalizeEventTimestamp(rawEvent);
  const sequence = normalizeEventSequence(rawEvent);
  const level = normalizeLogLevel(rawEvent);
  const type = normalizeEventType(rawEvent);
  const message = normalizeEventMessage(rawEvent, type);

  return { timestamp, sequence, level, type, message };
};

type RawEvent = NonNullable<IValidatedEvent>;

const normalizeEventTimestamp = (event: RawEvent): string => {
  invariant(event['@timestamp'], 'Required "@timestamp" field is not found');
  return event['@timestamp'];
};

const normalizeEventSequence = (event: RawEvent): number => {
  const value = event.event?.sequence;
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return Number(value);
  }
  return 0;
};

const normalizeLogLevel = (event: RawEvent): LogLevel => {
  const value = event.log?.level;
  if (!value) {
    return LogLevel.debug;
  }

  return logLevelFromString(value) ?? LogLevel.trace;
};

const normalizeEventType = (event: RawEvent): RuleExecutionEventType => {
  const value = event.event?.action;
  invariant(value, 'Required "event.action" field is not found');

  return ruleExecutionEventTypeFromString(value) ?? RuleExecutionEventType.message;
};

const normalizeEventMessage = (event: RawEvent, type: RuleExecutionEventType): string => {
  if (type === RuleExecutionEventType.message) {
    return event.message || '';
  }

  if (type === RuleExecutionEventType['status-change']) {
    invariant(
      event.kibana?.alert?.rule?.execution?.status,
      'Required "kibana.alert.rule.execution.status" field is not found'
    );

    const status = event.kibana?.alert?.rule?.execution?.status;
    const message = event.message || '';

    return `Rule changed status to "${status}". ${message}`;
  }

  if (type === RuleExecutionEventType['execution-metrics']) {
    return '';
  }

  assertUnreachable(type);
  return '';
};
