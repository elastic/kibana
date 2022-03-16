/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEventLogClient } from '../../../../../../event_log/server';

import {
  RuleExecutionEvent,
  RuleExecutionStatus,
} from '../../../../../common/detection_engine/schemas/common';
import { invariant } from '../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../utils/with_security_span';
import {
  RULE_SAVED_OBJECT_TYPE,
  RULE_EXECUTION_LOG_PROVIDER,
  RuleExecutionLogAction,
} from './constants';

export interface IEventLogReader {
  getLastStatusChanges(args: GetLastStatusChangesArgs): Promise<RuleExecutionEvent[]>;
}

export interface GetLastStatusChangesArgs {
  ruleId: string;
  count: number;
  includeStatuses?: RuleExecutionStatus[];
}

export const createEventLogReader = (eventLog: IEventLogClient): IEventLogReader => {
  return {
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
