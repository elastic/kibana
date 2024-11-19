/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnboardingHubTelemetryEvent } from './types';
import { OnboardingHubEventTypes } from './types';

export const onboardingHubStepOpenEvent: OnboardingHubTelemetryEvent = {
  eventType: OnboardingHubEventTypes.OnboardingHubStepOpen,
  schema: {
    stepId: {
      type: 'keyword',
      _meta: {
        description: 'Active step ID',
        optional: false,
      },
    },
    trigger: {
      type: 'keyword',
      _meta: {
        description: 'The action type that triggers the event',
        optional: false,
      },
    },
  },
};

export const onboardingHubStepLinkClickedEvent: OnboardingHubTelemetryEvent = {
  eventType: OnboardingHubEventTypes.OnboardingHubStepLinkClicked,
  schema: {
    originStepId: {
      type: 'keyword',
      _meta: {
        description: 'Active step ID',
        optional: false,
      },
    },
    stepLinkId: {
      type: 'keyword',
      _meta: {
        description: 'Clicked link',
        optional: false,
      },
    },
  },
};

export const onboardingHubStepFinishedEvent: OnboardingHubTelemetryEvent = {
  eventType: OnboardingHubEventTypes.OnboardingHubStepFinished,
  schema: {
    stepId: {
      type: 'keyword',
      _meta: {
        description: 'Finished step ID',
        optional: false,
      },
    },
    stepLinkId: {
      type: 'keyword',
      _meta: {
        description: 'Finished step link ID',
        optional: true,
      },
    },
    trigger: {
      type: 'keyword',
      _meta: {
        description: 'The action type that triggers the event',
        optional: false,
      },
    },
  },
};

export const onboardingHubTelemetryEvents = [
  onboardingHubStepOpenEvent,
  onboardingHubStepLinkClickedEvent,
  onboardingHubStepFinishedEvent,
];
