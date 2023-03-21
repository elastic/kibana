/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExtMeta } from '../utils/console_logging';
import type { RuleExecutionStatus } from '../../../../../../../common/detection_engine/rule_monitoring';
import type { RuleExecutionContext } from './client_interface';

export interface ICorrelationIds {
  withContext(context: RuleExecutionContext): ICorrelationIds;
  withStatus(status: RuleExecutionStatus): ICorrelationIds;

  /**
   * Returns a string with correlation ids that we append after the log message itself.
   */
  getLogSuffix(): string;

  /**
   * Returns correlation ids as a metadata object that we include into console log records (structured logs)
   */
  getLogMeta(): ExtMeta;
}

export const getCorrelationIds = (executionContext: RuleExecutionContext): ICorrelationIds => {
  return createBuilder({
    context: executionContext,
    status: null,
  });
};

interface BuilderState {
  context: RuleExecutionContext;
  status: RuleExecutionStatus | null;
}

const createBuilder = (state: BuilderState): ICorrelationIds => {
  const builder: ICorrelationIds = {
    withContext: (context: RuleExecutionContext): ICorrelationIds => {
      return createBuilder({
        ...state,
        context,
      });
    },

    withStatus: (status: RuleExecutionStatus): ICorrelationIds => {
      return createBuilder({
        ...state,
        status,
      });
    },

    getLogSuffix: (): string => {
      const { executionId, ruleId, ruleUuid, ruleName, ruleType, spaceId } = state.context;
      return `[${ruleType}][${ruleName}][rule id ${ruleId}][rule uuid ${ruleUuid}][exec id ${executionId}][space ${spaceId}]`;
    },

    getLogMeta: (): ExtMeta => {
      const { context, status } = state;

      const logMeta: ExtMeta = {
        rule: {
          id: context.ruleId,
          uuid: context.ruleUuid,
          name: context.ruleName,
          type: context.ruleType,
          execution: {
            uuid: context.executionId,
          },
        },
        kibana: {
          spaceId: context.spaceId,
        },
      };

      if (status != null && logMeta.rule.execution != null) {
        logMeta.rule.execution.status = status;
      }

      return logMeta;
    },
  };

  return builder;
};
