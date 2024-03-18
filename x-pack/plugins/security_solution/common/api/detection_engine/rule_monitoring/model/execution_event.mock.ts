/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionEvent } from './execution_event.gen';
import { LogLevelEnum, RuleExecutionEventTypeEnum } from './execution_event.gen';

const DEFAULT_TIMESTAMP = '2021-12-28T10:10:00.806Z';
const DEFAULT_SEQUENCE_NUMBER = 0;

const getMessageEvent = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    level: LogLevelEnum.debug,
    execution_id: 'execution-id-1',
    message: 'Some message',
    // Overridden values
    ...props,
    // Mandatory values for this type of event
    type: RuleExecutionEventTypeEnum.message,
  };
};

const getRunningStatusChange = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    execution_id: 'execution-id-1',
    message: 'Rule changed status to "running"',
    // Overridden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevelEnum.info,
    type: RuleExecutionEventTypeEnum['status-change'],
  };
};

const getPartialFailureStatusChange = (
  props: Partial<RuleExecutionEvent> = {}
): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    execution_id: 'execution-id-1',
    message: 'Rule changed status to "partial failure". Unknown error',
    // Overridden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevelEnum.warn,
    type: RuleExecutionEventTypeEnum['status-change'],
  };
};

const getFailedStatusChange = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    execution_id: 'execution-id-1',
    message: 'Rule changed status to "failed". Unknown error',
    // Overridden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevelEnum.error,
    type: RuleExecutionEventTypeEnum['status-change'],
  };
};

const getSucceededStatusChange = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    execution_id: 'execution-id-1',
    message: 'Rule changed status to "succeeded". Rule executed successfully',
    // Overridden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevelEnum.info,
    type: RuleExecutionEventTypeEnum['status-change'],
  };
};

const getExecutionMetricsEvent = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    execution_id: 'execution-id-1',
    message: JSON.stringify({ some_metric_ms: 10 }),
    // Overridden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevelEnum.debug,
    type: RuleExecutionEventTypeEnum['execution-metrics'],
  };
};

const getSomeEvents = (): RuleExecutionEvent[] => [
  getSucceededStatusChange({
    timestamp: '2021-12-28T10:10:09.806Z',
    sequence: 9,
  }),
  getExecutionMetricsEvent({
    timestamp: '2021-12-28T10:10:08.806Z',
    sequence: 8,
  }),
  getRunningStatusChange({
    timestamp: '2021-12-28T10:10:07.806Z',
    sequence: 7,
  }),
  getMessageEvent({
    timestamp: '2021-12-28T10:10:06.806Z',
    sequence: 6,
    level: LogLevelEnum.debug,
    message: 'Rule execution started',
  }),
  getFailedStatusChange({
    timestamp: '2021-12-28T10:10:05.806Z',
    sequence: 5,
  }),
  getExecutionMetricsEvent({
    timestamp: '2021-12-28T10:10:04.806Z',
    sequence: 4,
  }),
  getPartialFailureStatusChange({
    timestamp: '2021-12-28T10:10:03.806Z',
    sequence: 3,
  }),
  getMessageEvent({
    timestamp: '2021-12-28T10:10:02.806Z',
    sequence: 2,
    level: LogLevelEnum.error,
    message: 'Some error',
  }),
  getRunningStatusChange({
    timestamp: '2021-12-28T10:10:01.806Z',
    sequence: 1,
  }),
  getMessageEvent({
    timestamp: '2021-12-28T10:10:00.806Z',
    sequence: 0,
    level: LogLevelEnum.debug,
    message: 'Rule execution started',
  }),
];

export const ruleExecutionEventMock = {
  getSomeEvents,
};
