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

import { ExtMeta } from '../utils/logging';
import { truncateValue } from '../utils/normalization';

import { IRuleExecutionEventsWriter } from '../rule_execution_events/events_writer';
import { IRuleExecutionInfoSavedObjectsClient } from '../rule_execution_info/saved_objects_client';
import { IRuleExecutionLogger, RuleExecutionContext, StatusChangeArgs } from './logger_interface';

export const createRuleExecutionLogger = (
  savedObjectsClient: IRuleExecutionInfoSavedObjectsClient,
  eventsWriter: IRuleExecutionEventsWriter,
  logger: Logger,
  context: RuleExecutionContext
): IRuleExecutionLogger => {
  const { executionId, ruleId, ruleName, ruleType, spaceId } = context;

  const ruleExecutionLogger: IRuleExecutionLogger = {
    get context() {
      return context;
    },

    async logStatusChange(args) {
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
    },
  };

  // TODO: Add executionId to new status SO?
  const writeStatusChangeToSavedObjects = async (
    args: NormalizedStatusChangeArgs
  ): Promise<void> => {
    const { newStatus, message, metrics } = args;

    await savedObjectsClient.createOrUpdate(ruleId, {
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
      eventsWriter.logExecutionMetrics({
        executionId,
        ruleId,
        ruleName,
        ruleType,
        spaceId,
        metrics,
      });
    }

    eventsWriter.logStatusChange({
      executionId,
      ruleId,
      ruleName,
      ruleType,
      spaceId,
      newStatus,
      message,
    });
  };

  return ruleExecutionLogger;
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
