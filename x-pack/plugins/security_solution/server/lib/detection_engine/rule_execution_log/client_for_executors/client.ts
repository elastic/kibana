/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sum } from 'lodash';
import { Duration } from 'moment';
import { Logger } from 'src/core/server';

import {
  RuleExecutionStatus,
  ruleExecutionStatusOrderByStatus,
  RuleExecutionMetrics,
} from '../../../../../common/detection_engine/schemas/common';

import { withSecuritySpan } from '../../../../utils/with_security_span';
import { ExtMeta } from '../utils/console_logging';
import { truncateValue } from '../utils/normalization';

import { IEventLogWriter } from '../event_log/event_log_writer';
import { IRuleExecutionSavedObjectsClient } from '../execution_saved_object/saved_objects_client';
import {
  IRuleExecutionLogForExecutors,
  RuleExecutionContext,
  StatusChangeArgs,
} from './client_interface';

export const createClientForExecutors = (
  soClient: IRuleExecutionSavedObjectsClient,
  eventLog: IEventLogWriter,
  logger: Logger,
  context: RuleExecutionContext
): IRuleExecutionLogForExecutors => {
  const { executionId, ruleId, ruleName, ruleType, spaceId } = context;

  const client: IRuleExecutionLogForExecutors = {
    get context() {
      return context;
    },

    async logStatusChange(args) {
      await withSecuritySpan('IRuleExecutionLogForExecutors.logStatusChange', async () => {
        try {
          const normalizedArgs = normalizeStatusChangeArgs(args);
          await Promise.all([
            writeStatusChangeToSavedObjects(normalizedArgs),
            writeStatusChangeToEventLog(normalizedArgs),
          ]);
        } catch (e) {
          const logMessage = 'Error logging rule execution status change';
          const logAttributes = `status: "${args.newStatus}", rule id: "${ruleId}", rule name: "${ruleName}", execution uuid: "${executionId}"`;
          const logReason = e instanceof Error ? e.stack ?? e.message : String(e);
          const logMeta: ExtMeta = {
            rule: {
              id: ruleId,
              name: ruleName,
              type: ruleType,
              execution: {
                status: args.newStatus,
                uuid: executionId,
              },
            },
            kibana: {
              spaceId,
            },
          };

          logger.error<ExtMeta>(`${logMessage}; ${logAttributes}; ${logReason}`, logMeta);
        }
      });
    },
  };

  // TODO: Add executionId to new status SO?
  const writeStatusChangeToSavedObjects = async (
    args: NormalizedStatusChangeArgs
  ): Promise<void> => {
    const { newStatus, message, metrics } = args;

    await soClient.createOrUpdate(ruleId, {
      last_execution: {
        date: nowISO(),
        status: newStatus,
        status_order: ruleExecutionStatusOrderByStatus[newStatus],
        message,
        metrics: metrics ?? {},
      },
    });
  };

  const writeStatusChangeToEventLog = (args: NormalizedStatusChangeArgs): void => {
    const { newStatus, message, metrics } = args;

    if (metrics) {
      eventLog.logExecutionMetrics({
        executionId,
        ruleId,
        ruleName,
        ruleType,
        spaceId,
        metrics,
      });
    }

    eventLog.logStatusChange({
      executionId,
      ruleId,
      ruleName,
      ruleType,
      spaceId,
      newStatus,
      message,
    });
  };

  return client;
};

const nowISO = () => new Date().toISOString();

interface NormalizedStatusChangeArgs {
  newStatus: RuleExecutionStatus;
  message: string;
  metrics?: RuleExecutionMetrics;
}

const normalizeStatusChangeArgs = (args: StatusChangeArgs): NormalizedStatusChangeArgs => {
  const { newStatus, message, metrics } = args;

  return {
    newStatus,
    message: truncateValue(message) ?? '',
    metrics: metrics
      ? {
          total_search_duration_ms: normalizeDurations(metrics.searchDurations),
          total_indexing_duration_ms: normalizeDurations(metrics.indexingDurations),
          execution_gap_duration_s: normalizeGap(metrics.executionGap),
        }
      : undefined,
  };
};

const normalizeDurations = (durations?: string[]): number | undefined => {
  if (durations == null) {
    return undefined;
  }

  const sumAsFloat = sum(durations.map(Number));
  return Math.round(sumAsFloat);
};

const normalizeGap = (duration?: Duration): number | undefined => {
  return duration ? Math.round(duration.asSeconds()) : undefined;
};
