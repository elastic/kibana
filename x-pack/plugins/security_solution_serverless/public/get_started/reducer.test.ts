/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProductLine } from '../../common/product';
import { setupActiveSections } from './helpers';
import {
  reducer,
  getFinishedStepsInitialStates,
  getActiveProductsInitialStates,
  getActiveSectionsInitialStates,
} from './reducer';
import type { ExpandedCardSteps } from './types';
import {
  GetSetUpCardId,
  GetStartedPageActions,
  IntroductionSteps,
  SectionId,
  type CardId,
  type StepId,
  type ToggleProductAction,
  type AddFinishedStepAction,
  ConfigureSteps,
  ExploreSteps,
} from './types';

describe('reducer', () => {
  it('should toggle section correctly', () => {
    const activeProducts = new Set([ProductLine.security]);
    const finishedSteps = {} as Record<CardId, Set<StepId>>;
    const { activeSections, totalStepsLeft, totalActiveSteps } = setupActiveSections(
      finishedSteps,
      activeProducts
    );
    const initialState = {
      activeProducts: new Set([ProductLine.security]),
      finishedSteps,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
      expandedCardSteps: {} as ExpandedCardSteps,
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
    const activeProducts = new Set([ProductLine.security]);
    const finishedSteps = {} as Record<CardId, Set<StepId>>;
    const { activeSections, totalStepsLeft, totalActiveSteps } = setupActiveSections(
      finishedSteps,
      activeProducts
    );
    const initialState = {
      activeProducts: new Set([ProductLine.security]),
      finishedSteps,
      activeSections,
      totalStepsLeft,
      totalActiveSteps,
      expandedCardSteps: {} as ExpandedCardSteps,
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
          stepsLeft: 0,
          timeInMins: 0,
          activeStepIds: [IntroductionSteps.getToKnowElasticSecurity],
        },
        [GetSetUpCardId.configure]: {
          id: GetSetUpCardId.configure,
          stepsLeft: 4,
          timeInMins: 0,
          activeStepIds: [
            ConfigureSteps.learnAbout,
            ConfigureSteps.deployElasticAgent,
            ConfigureSteps.connectToDataSources,
            ConfigureSteps.enablePrebuiltRules,
          ],
        },
        [GetSetUpCardId.explore]: {
          id: GetSetUpCardId.explore,
          stepsLeft: 2,
          timeInMins: 0,
          activeStepIds: [ExploreSteps.viewAlerts, ExploreSteps.analyzeData],
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
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    } as unknown as Record<CardId, Set<StepId>>;

    const {
      activeSections: initialStates,
      totalActiveSteps,
      totalStepsLeft,
    } = getActiveSectionsInitialStates({
      activeProducts,
      finishedSteps,
    });

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
    });

    expect(totalActiveSteps).toEqual(7);
    expect(totalStepsLeft).toEqual(6);
  });
});
