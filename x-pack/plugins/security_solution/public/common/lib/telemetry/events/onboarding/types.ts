/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

type OnboardingHubStepOpenTrigger = 'navigation' | 'click';

interface OnboardingHubStepOpenParams {
  stepId: string;
  trigger: OnboardingHubStepOpenTrigger;
}

export enum OnboardingHubEventTypes {
  OnboardingHubStepOpen = 'Onboarding Hub Step Open',
  OnboardingHubStepFinished = 'Onboarding Hub Step Finished',
  OnboardingHubStepLinkClicked = 'Onboarding Hub Step Link Clicked',
}

export type OnboardingHubEventTypeData = {
  [K in OnboardingHubEventTypes]: K extends OnboardingHubEventTypes.OnboardingHubStepOpen
    ? OnboardingHubStepOpenParams
    : K extends OnboardingHubEventTypes.OnboardingHubStepFinished
    ? OnboardingHubStepFinishedParams
    : K extends OnboardingHubEventTypes.OnboardingHubStepLinkClicked
    ? OnboardingHubStepLinkClickedParams
    : never;
};

export interface OnboardingHubStepOpen {
  eventType: OnboardingHubEventTypes.OnboardingHubStepOpen;
  schema: RootSchema<OnboardingHubStepOpenParams>;
}

export interface OnboardingHubStepLinkClickedParams {
  originStepId: string;
  stepLinkId: string;
}

export interface OnboardingHubStepLinkClicked {
  eventType: OnboardingHubEventTypes.OnboardingHubStepLinkClicked;
  schema: RootSchema<OnboardingHubStepLinkClickedParams>;
}

export type OnboardingHubStepFinishedTrigger = 'auto_check' | 'click';

export interface OnboardingHubStepFinishedParams {
  stepId: string;
  stepLinkId?: string;
  trigger: OnboardingHubStepFinishedTrigger;
}

export interface OnboardingHubStepFinished {
  eventType: OnboardingHubEventTypes.OnboardingHubStepFinished;
  schema: RootSchema<OnboardingHubStepFinishedParams>;
}

export type OnboardingHubTelemetryEvent =
  | OnboardingHubStepOpen
  | OnboardingHubStepFinished
  | OnboardingHubStepLinkClicked;
