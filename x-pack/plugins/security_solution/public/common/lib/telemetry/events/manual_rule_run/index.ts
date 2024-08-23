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
        description:
          'The time range (expressed in milliseconds) against which the manual rule run was executed',
        optional: false,
      },
    },
    status: {
      type: 'keyword',
      _meta: {
        description:
          'Outcome state of the manual rule run. Possible values are "success" and "error"',
        optional: false,
      },
    },
    rulesCount: {
      type: 'integer',
      _meta: {
        description: 'Number of rules that were executed in the manual rule run',
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
        description:
          'Total number of scheduled tasks (rule executions) at the moment of backfill cancellation',
        optional: false,
      },
    },
    completedTasks: {
      type: 'integer',
      _meta: {
        description: 'Number of completed rule executions at the moment of backfill cancellation',
        optional: false,
      },
    },
    errorTasks: {
      type: 'integer',
      _meta: {
        description: 'Number of error rule executions at the moment of backfill cancellation',
        optional: false,
      },
    },
  },
};
