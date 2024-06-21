/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core-analytics-browser';
import { TelemetryEventType, type TelemetryEventTypeData } from './types';

type TelemetryEventsSchemas = {
  [T in TelemetryEventType]: RootSchema<TelemetryEventTypeData<T>>;
};

/**
 * telemetryEventsSchemas
 * Defines the schema for each of the event types
 * */
export const telemetryEventsSchemas: TelemetryEventsSchemas = {
  [TelemetryEventType.AssistantProcessStart]: {
    processId: {
      type: 'keyword',
      _meta: {
        description: 'Process ID to identify all the events of the same process',
        optional: false,
      },
    },
    customerId: {
      type: 'keyword',
      _meta: {
        description: 'The customer ID to identify the user',
        optional: false,
      },
    },
  },

  [TelemetryEventType.AssistantProcessSuccess]: {
    processId: {
      type: 'keyword',
      _meta: {
        description: 'Process ID to identify all the events of the same process',
        optional: false,
      },
    },
    userId: {
      type: 'keyword',
      _meta: {
        description: 'The user ID to identify the user',
        optional: false,
      },
    },
  },

  [TelemetryEventType.AssistantStepFinish]: {
    processId: {
      type: 'keyword',
      _meta: {
        description: 'Process ID to identify all the events of the same process',
        optional: false,
      },
    },
    stepId: {
      type: 'keyword',
      _meta: {
        description: 'The step ID to identify the step',
        optional: false,
      },
    },
    duration: {
      type: 'long',
      _meta: {
        description: 'The duration of the step',
        optional: false,
      },
    },
    userId: {
      type: 'keyword',
      _meta: {
        description: 'The user ID to identify the user',
        optional: false,
      },
    },
  },
};
