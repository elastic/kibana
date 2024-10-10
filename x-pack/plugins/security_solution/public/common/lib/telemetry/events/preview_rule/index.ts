/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TelemetryEvent } from '../../types';
import { TelemetryEventTypes } from '../../constants';

export const previewRuleEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.PreviewRule,
  schema: {
    ruleType: {
      type: 'keyword',
      _meta: {
        description: 'Rule type',
        optional: false,
      },
    },
    loggedRequestsEnabled: {
      type: 'boolean',
      _meta: {
        description: 'shows if preview executed with enabled logged requests',
        optional: false,
      },
    },
  },
};
