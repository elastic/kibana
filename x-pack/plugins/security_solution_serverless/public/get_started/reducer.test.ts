/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductLine } from '../../common/product';
import {
  reducer,
  getFinishedStepsInitialStates,
  getActiveSectionsInitialStates,
  getActiveCardsInitialStates,
} from './reducer';
import {
  GetSetUpCardId,
  GetStartedPageActions,
  IntroductionSteps,
  SectionId,
  GetMoreFromElasticSecurityCardId,
  type ActiveSections,
  type CardId,
  type StepId,
  type ToggleProductAction,
  type AddFinishedStepAction,
  ConfigureSteps,
  ExploreSteps,
  OptimizeYourWorkSpaceSteps,
  MasterTheInvestigationsWorkflowSteps,
} from './types';

describe('reducer', () => {
  it('should toggle section correctly', () => {
    const initialState = {
      activeProducts: new Set([ProductLine.security]),
      finishedSteps: {} as Record<CardId, Set<StepId>>,
      activeSections: {} as ActiveSections | null,
    };

    const action: ToggleProductAction = {
      type: GetStartedPageActions.ToggleProduct,
      payload: { section: ProductLine.security },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.activeProducts.has(ProductLine.security)).toBe(false);
    expect(nextState.activeSections).toBeNull();
  });

  it('should add a finished step correctly', () => {
    const initialState = {
      activeProducts: new Set([ProductLine.security]),
      finishedSteps: {} as Record<CardId, Set<StepId>>,
      activeSections: {
        getSetUp: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            stepsLeft: 1,
            timeInMins: 3,
          },
        },
      } as unknown as ActiveSections | null,
    };

    const action: AddFinishedStepAction = {
      type: GetStartedPageActions.AddFinishedStep,
      payload: {
        cardId: GetSetUpCardId.introduction,
        stepId: IntroductionSteps.getToKnowElasticSecurity,
        sectionId: SectionId.getSetUp,
      },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.finishedSteps[GetSetUpCardId.introduction]).toEqual(
      new Set([IntroductionSteps.getToKnowElasticSecurity])
    );
    expect(nextState.activeSections).toEqual({
      getSetUp: {
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          stepsLeft: 1,
          timeInMins: 3,
        },
      },
    });
  });
});

describe('getFinishedStepsInitialStates', () => {
  it('should return the initial states of finished steps correctly', () => {
    const finishedSteps = {
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity],
      [GetSetUpCardId.configure]: [],
    } as unknown as Record<CardId, StepId[]>;

    const initialStates = getFinishedStepsInitialStates({ finishedSteps });

    expect(initialStates[GetSetUpCardId.introduction]).toEqual(
      new Set([IntroductionSteps.getToKnowElasticSecurity])
    );
    expect(initialStates[GetSetUpCardId.configure]).toEqual(new Set([]));
  });
});

describe('getActiveSectionsInitialStates', () => {
  it('should return the initial states of active sections correctly', () => {
    const activeProducts = [ProductLine.security];

    const initialStates = getActiveSectionsInitialStates({ activeProducts });

    expect(initialStates.has(ProductLine.security)).toBe(true);
  });
});

describe('getActiveCardsInitialStates', () => {
  it('should return the initial states of active cards correctly', () => {
    const activeProducts = new Set([ProductLine.security]);
    const finishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    } as unknown as Record<CardId, Set<StepId>>;

    const initialStates = getActiveCardsInitialStates({ activeProducts, finishedSteps });

    expect(initialStates).toEqual({
      [SectionId.getSetUp]: {
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          timeInMins: 0,
          stepsLeft: 0,
          activeStepIds: [IntroductionSteps.getToKnowElasticSecurity],
        },
        [GetSetUpCardId.configure]: {
          id: GetSetUpCardId.configure,
          timeInMins: 0,
          stepsLeft: 4,
          activeStepIds: [
            ConfigureSteps.learnAbout,
            ConfigureSteps.deployElasticAgent,
            ConfigureSteps.connectToDataSources,
            ConfigureSteps.enablePrebuiltRules,
          ],
        },
        [GetSetUpCardId.explore]: {
          id: GetSetUpCardId.explore,
          timeInMins: 0,
          stepsLeft: 2,
          activeStepIds: [ExploreSteps.viewAlerts, ExploreSteps.analyzeData],
        },
      },
      [SectionId.getMoreFromElasticSecurity]: {
        [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
          id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
          stepsLeft: 3,
          timeInMins: 0,
          activeStepIds: [
            MasterTheInvestigationsWorkflowSteps.introductionToInvestigations,
            MasterTheInvestigationsWorkflowSteps.exploreThreatHunting,
            MasterTheInvestigationsWorkflowSteps.introductionToCases,
          ],
        },
        [GetMoreFromElasticSecurityCardId.respondToThreats]: {
          id: GetMoreFromElasticSecurityCardId.respondToThreats,
          stepsLeft: 0,
          timeInMins: 0,
          activeStepIds: [],
        },
        [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
          id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
          stepsLeft: 5,
          timeInMins: 0,
          activeStepIds: [
            OptimizeYourWorkSpaceSteps.enableThreatIntelligence,
            OptimizeYourWorkSpaceSteps.enableEntityAnalytics,
            OptimizeYourWorkSpaceSteps.createCustomRules,
            OptimizeYourWorkSpaceSteps.introductionToExceptions,
            OptimizeYourWorkSpaceSteps.connectNotification,
          ],
        },
      },
    });
  });
});
