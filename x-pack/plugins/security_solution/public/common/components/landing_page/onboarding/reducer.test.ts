/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductLine } from './configs';
import { setupActiveSections } from './helpers';
import {
  reducer,
  getFinishedStepsInitialStates,
  getActiveProductsInitialStates,
  getActiveSectionsInitialStates,
} from './reducer';
import type {
  AddFinishedStepAction,
  CardId,
  ExpandedCardSteps,
  StepId,
  ToggleProductAction,
} from './types';
import {
  AddAndValidateYourDataCardsId,
  AddIntegrationsSteps,
  CreateProjectSteps,
  EnablePrebuiltRulesSteps,
  OnboardingActions,
  GetStartedWithAlertsCardsId,
  OverviewSteps,
  QuickStartSectionCardsId,
  SectionId,
  ViewAlertsSteps,
  ViewDashboardSteps,
} from './types';
const onboardingSteps = [
  CreateProjectSteps.createFirstProject,
  OverviewSteps.getToKnowElasticSecurity,
  AddIntegrationsSteps.connectToDataSources,
  ViewDashboardSteps.analyzeData,
  EnablePrebuiltRulesSteps.enablePrebuiltRules,
  ViewAlertsSteps.viewAlerts,
];

describe('reducer', () => {
  it('should toggle section correctly', () => {
    const activeProducts = new Set([ProductLine.security]);
    const finishedSteps = {
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    } as Record<CardId, Set<StepId>>;
    const { activeSections, totalStepsLeft, totalActiveSteps } = setupActiveSections(
      finishedSteps,
      activeProducts,
      [OverviewSteps.getToKnowElasticSecurity]
    );
    const initialState = {
      activeProducts: new Set([ProductLine.security]),
      finishedSteps,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
      expandedCardSteps: {} as ExpandedCardSteps,
      onboardingSteps,
    };

    const action: ToggleProductAction = {
      type: OnboardingActions.ToggleProduct,
      payload: { section: ProductLine.security },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.activeProducts.has(ProductLine.security)).toBe(false);
    expect(nextState.activeSections).toBeNull();
  });

  it('should add a finished step correctly', () => {
    const activeProducts = new Set([ProductLine.security]);
    const finishedSteps = {
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    } as Record<CardId, Set<StepId>>;
    const { activeSections, totalStepsLeft, totalActiveSteps } = setupActiveSections(
      finishedSteps,
      activeProducts,
      onboardingSteps
    );
    const initialState = {
      activeProducts: new Set([ProductLine.security]),
      finishedSteps,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
      expandedCardSteps: {} as ExpandedCardSteps,
      onboardingSteps,
    };

    const action: AddFinishedStepAction = {
      type: OnboardingActions.AddFinishedStep,
      payload: {
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        stepId: OverviewSteps.getToKnowElasticSecurity,
        sectionId: SectionId.quickStart,
      },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.finishedSteps[QuickStartSectionCardsId.watchTheOverviewVideo]).toEqual(
      new Set([OverviewSteps.getToKnowElasticSecurity])
    );
    expect(nextState.activeSections).toEqual({
      [SectionId.quickStart]: {
        [QuickStartSectionCardsId.createFirstProject]: {
          id: QuickStartSectionCardsId.createFirstProject,
          timeInMins: 0,
          stepsLeft: 0,
          activeStepIds: [CreateProjectSteps.createFirstProject],
        },
        [QuickStartSectionCardsId.watchTheOverviewVideo]: {
          id: QuickStartSectionCardsId.watchTheOverviewVideo,
          timeInMins: 0,
          stepsLeft: 0,
          activeStepIds: [OverviewSteps.getToKnowElasticSecurity],
        },
      },
      [SectionId.addAndValidateYourData]: {
        [AddAndValidateYourDataCardsId.addIntegrations]: {
          id: AddAndValidateYourDataCardsId.addIntegrations,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [AddIntegrationsSteps.connectToDataSources],
        },
        [AddAndValidateYourDataCardsId.viewDashboards]: {
          id: AddAndValidateYourDataCardsId.viewDashboards,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [ViewDashboardSteps.analyzeData],
        },
      },
      [SectionId.getStartedWithAlerts]: {
        [GetStartedWithAlertsCardsId.enablePrebuiltRules]: {
          id: GetStartedWithAlertsCardsId.enablePrebuiltRules,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [EnablePrebuiltRulesSteps.enablePrebuiltRules],
        },
        [GetStartedWithAlertsCardsId.viewAlerts]: {
          id: GetStartedWithAlertsCardsId.viewAlerts,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [ViewAlertsSteps.viewAlerts],
        },
      },
    });
  });
});

describe('getFinishedStepsInitialStates', () => {
  it('should return the initial states of finished steps correctly', () => {
    const finishedSteps = {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: [],
    } as unknown as Record<CardId, StepId[]>;

    const initialStates = getFinishedStepsInitialStates({ finishedSteps });

    expect(initialStates[QuickStartSectionCardsId.createFirstProject]).toEqual(
      new Set([CreateProjectSteps.createFirstProject])
    );
    expect(initialStates[QuickStartSectionCardsId.watchTheOverviewVideo]).toEqual(new Set([]));
  });
});

describe('getActiveProductsInitialStates', () => {
  it('should return the initial states of active sections correctly', () => {
    const activeProducts = [ProductLine.security];

    const initialStates = getActiveProductsInitialStates({ activeProducts });

    expect(initialStates.has(ProductLine.security)).toBe(true);
  });
});

describe('getActiveSectionsInitialStates', () => {
  it('should return the initial states of active cards correctly', () => {
    const activeProducts = new Set([ProductLine.security]);
    const finishedSteps = {
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    } as unknown as Record<CardId, Set<StepId>>;

    const {
      activeSections: initialStates,
      totalActiveSteps,
      totalStepsLeft,
    } = getActiveSectionsInitialStates({
      activeProducts,
      finishedSteps,
      onboardingSteps,
    });

    expect(initialStates).toEqual({
      [SectionId.quickStart]: {
        [QuickStartSectionCardsId.createFirstProject]: {
          id: QuickStartSectionCardsId.createFirstProject,
          timeInMins: 0,
          stepsLeft: 0,
          activeStepIds: [CreateProjectSteps.createFirstProject],
        },
        [QuickStartSectionCardsId.watchTheOverviewVideo]: {
          id: QuickStartSectionCardsId.watchTheOverviewVideo,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [OverviewSteps.getToKnowElasticSecurity],
        },
      },
      [SectionId.addAndValidateYourData]: {
        [AddAndValidateYourDataCardsId.addIntegrations]: {
          id: AddAndValidateYourDataCardsId.addIntegrations,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [AddIntegrationsSteps.connectToDataSources],
        },
        [AddAndValidateYourDataCardsId.viewDashboards]: {
          id: AddAndValidateYourDataCardsId.viewDashboards,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [ViewDashboardSteps.analyzeData],
        },
      },
      [SectionId.getStartedWithAlerts]: {
        [GetStartedWithAlertsCardsId.enablePrebuiltRules]: {
          id: GetStartedWithAlertsCardsId.enablePrebuiltRules,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [EnablePrebuiltRulesSteps.enablePrebuiltRules],
        },
        [GetStartedWithAlertsCardsId.viewAlerts]: {
          id: GetStartedWithAlertsCardsId.viewAlerts,
          timeInMins: 0,
          stepsLeft: 1,
          activeStepIds: [ViewAlertsSteps.viewAlerts],
        },
      },
    });

    expect(totalActiveSteps).toEqual(6);
    expect(totalStepsLeft).toEqual(5);
  });
});
