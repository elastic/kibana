/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/analytics-client';
import type { StepLinkId } from '../../../../components/landing_page/onboarding/step_links/types';
import type { TelemetryEventTypes } from '../../constants';

export interface OnboardingHubStepOpenParams {
  stepId: string;
  trigger: 'page_load' | 'click';
}

export interface OnboardingHubStepOpen {
  eventType: TelemetryEventTypes.OnboardingHubStepOpen;
  schema: RootSchema<OnboardingHubStepOpenParams>;
}

export interface OnboardingHubStepLinkClickedParams {
  originStepId: string;
  stepLinkId: StepLinkId;
}

export interface OnboardingHubStepLinkClicked {
  eventType: TelemetryEventTypes.OnboardingHubStepLinkClicked;
  schema: RootSchema<OnboardingHubStepLinkClickedParams>;
}

export interface OnboardingHubStepFinishedParams {
  stepId: string;
  stepLinkId?: StepLinkId;
  trigger: 'page_load' | 'click';
}

export interface OnboardingHubStepFinished {
  eventType: TelemetryEventTypes.OnboardingHubStepFinished;
  schema: RootSchema<OnboardingHubStepFinishedParams>;
}

export type OnboardingHubTelemetryEvent =
  | OnboardingHubStepOpen
  | OnboardingHubStepFinished
  | OnboardingHubStepLinkClicked;
