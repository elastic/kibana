/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const manualRuleRunOpenModalEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.ManualRuleRunOpenModal,
  schema: {
    type: {
      type: 'keyword',
      _meta: {
        description: 'Open manual rule run modal (single|bulk)',
        optional: false,
      },
    },
  },
};

export const manualRuleRunExecuteEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.ManualRuleRunExecute,
  schema: {
    rangeInMs: {
      type: 'integer',
      _meta: {
        description: 'Execute manual rule run with range in milliseconds',
        optional: false,
      },
    },
  },
};

export const manualRuleRunCancelJobEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.ManualRuleRunCancelJob,
  schema: {
    totalTasks: {
      type: 'integer',
      _meta: {
        description: 'Amount of total tasks on moment of cancel job',
        optional: false,
      },
    },
    completedTasks: {
      type: 'integer',
      _meta: {
        description: 'Amount of total tasks on moment of cancel job',
        optional: false,
      },
    },
    errorTasks: {
      type: 'integer',
      _meta: {
        description: 'Amount of error task on moment of cancel job',
        optional: false,
      },
    },
  },
};
