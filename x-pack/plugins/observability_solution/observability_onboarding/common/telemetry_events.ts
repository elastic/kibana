/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type EventTypeOpts } from '@elastic/ebt/client';

export const OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT: EventTypeOpts<{
  flow?: string;
  step?: string;
  step_status?: string;
  step_message?: string;
  uses_legacy_onboarding_page: boolean;
}> = {
  eventType: 'observability_onboarding',
  schema: {
    flow: {
      type: 'keyword',
      _meta: {
        description:
          "The current onboarding flow user is going through (e.g. 'system_logs', 'nginx'). If not present, user is on the landing screen.",
        optional: true,
      },
    },
    step: {
      type: 'keyword',
      _meta: {
        description: 'The current step in the onboarding flow.',
        optional: true,
      },
    },
    step_status: {
      type: 'keyword',
      _meta: {
        description: 'The status of the step in the onboarding flow.',
        optional: true,
      },
    },
    step_message: {
      type: 'keyword',
      _meta: {
        description: 'Error or warning message of the current step in the onboarding flow',
        optional: true,
      },
    },
    uses_legacy_onboarding_page: {
      type: 'boolean',
      _meta: {
        description: 'Whether the user is using the legacy onboarding page or the new one',
      },
    },
  },
};
