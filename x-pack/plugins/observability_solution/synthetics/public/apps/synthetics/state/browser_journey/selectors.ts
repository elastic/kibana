/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SyntheticsAppState } from '../root_reducer';

export const selectBrowserJourneyState = (state: SyntheticsAppState) => state.browserJourney;
export const selectBrowserJourney = (checkGroup?: string) => (state: SyntheticsAppState) =>
  checkGroup ? state.browserJourney.journeys[checkGroup] : undefined;

export const selectBrowserJourneyLoading = (checkGroup?: string) => (state: SyntheticsAppState) =>
  checkGroup ? state.browserJourney.journeysLoading[checkGroup] : false;
