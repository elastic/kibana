/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleExecutionEvent } from './execution_event';
import { RuleExecutionEventType } from './execution_event';
import { LogLevel } from './log_level';

const DEFAULT_TIMESTAMP = '2021-12-28T10:10:00.806Z';
const DEFAULT_SEQUENCE_NUMBER = 0;

const getMessageEvent = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    level: LogLevel.debug,
    message: 'Some message',
    // Overriden values
    ...props,
    // Mandatory values for this type of event
    type: RuleExecutionEventType.message,
  };
};

const getRunningStatusChange = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    message: 'Rule changed status to "running"',
    // Overriden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevel.info,
    type: RuleExecutionEventType['status-change'],
  };
};

const getPartialFailureStatusChange = (
  props: Partial<RuleExecutionEvent> = {}
): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    message: 'Rule changed status to "partial failure". Unknown error',
    // Overriden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevel.warn,
    type: RuleExecutionEventType['status-change'],
  };
};

const getFailedStatusChange = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    message: 'Rule changed status to "failed". Unknown error',
    // Overriden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevel.error,
    type: RuleExecutionEventType['status-change'],
  };
};

const getSucceededStatusChange = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    message: 'Rule changed status to "succeeded". Rule executed successfully',
    // Overriden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevel.info,
    type: RuleExecutionEventType['status-change'],
  };
};

const getExecutionMetricsEvent = (props: Partial<RuleExecutionEvent> = {}): RuleExecutionEvent => {
  return {
    // Default values
    timestamp: DEFAULT_TIMESTAMP,
    sequence: DEFAULT_SEQUENCE_NUMBER,
    message: '',
    // Overriden values
    ...props,
    // Mandatory values for this type of event
    level: LogLevel.debug,
    type: RuleExecutionEventType['execution-metrics'],
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
    level: LogLevel.debug,
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
    level: LogLevel.error,
    message: 'Some error',
  }),
  getRunningStatusChange({
    timestamp: '2021-12-28T10:10:01.806Z',
    sequence: 1,
  }),
  getMessageEvent({
    timestamp: '2021-12-28T10:10:00.806Z',
    sequence: 0,
    level: LogLevel.debug,
    message: 'Rule execution started',
  }),
];

export const ruleExecutionEventMock = {
  getSomeEvents,
};
