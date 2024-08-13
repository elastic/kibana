/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupActiveSections } from './helpers';
import { reducer, getActiveSectionsInitialStates } from './reducer';
import type { AddFinishedCardAction } from './types';
import { SectionId, CardId, OnboardingActions } from './types';
const onboardingSteps = [
  CardId.createFirstProject,
  CardId.watchTheOverviewVideo,
  CardId.addIntegrations,
  CardId.viewDashboards,
  CardId.enablePrebuiltRules,
  CardId.viewAlerts,
];

describe('reducer', () => {
  it('should add a finished card correctly', () => {
    const finishedCardIds = new Set([CardId.createFirstProject]);
    const activeSections = setupActiveSections(onboardingSteps);
    const initialState = {
      activeSections,
      expandedCardIds: new Set<CardId>(),
      finishedCardIds,
      onboardingSteps,
    };

    const action: AddFinishedCardAction = {
      type: OnboardingActions.AddFinishedCard,
      payload: {
        cardId: CardId.watchTheOverviewVideo,
      },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.finishedCardIds).toEqual(
      new Set([CardId.createFirstProject, CardId.watchTheOverviewVideo])
    );
    expect(nextState.activeSections).toEqual({
      [SectionId.quickStart]: [CardId.createFirstProject, CardId.watchTheOverviewVideo],
      [SectionId.addAndValidateYourData]: [CardId.addIntegrations, CardId.viewDashboards],
      [SectionId.getStartedWithAlerts]: [CardId.enablePrebuiltRules, CardId.viewAlerts],
    });
  });
});

describe('getActiveSectionsInitialStates', () => {
  it('should return the initial states of active cards correctly', () => {
    const initialStates = getActiveSectionsInitialStates({
      onboardingSteps,
    });

    expect(initialStates).toEqual({
      [SectionId.quickStart]: [CardId.createFirstProject, CardId.watchTheOverviewVideo],
      [SectionId.addAndValidateYourData]: [CardId.addIntegrations, CardId.viewDashboards],
      [SectionId.getStartedWithAlerts]: [CardId.enablePrebuiltRules, CardId.viewAlerts],
    });
  });
});
