/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  reducer,
  getFinishedStepsInitialStates,
  getActiveSectionsInitialStates,
  getActiveCardsInitialStates,
} from './reducer';
import {
  ActiveCard,
  CardId,
  GetSetUpCardId,
  GetStartedPageActions,
  IntroductionSteps,
  ProductId,
  SectionId,
  StepId,
  ToggleProductAction,
  ToggleStepAction,
} from './types';

describe('reducer', () => {
  it('should toggle section correctly', () => {
    const initialState = {
      activeProducts: new Set([ProductId.analytics]),
      finishedSteps: {} as Record<CardId, Set<StepId>>,
      activeCards: {} as Record<SectionId, Record<CardId, ActiveCard>> | null,
    };

    const action: ToggleProductAction = {
      type: GetStartedPageActions.ToggleProduct,
      payload: { section: ProductId.analytics },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.activeProducts.has(ProductId.analytics)).toBe(false);
    expect(nextState.activeCards).toBeNull();
  });

  it('should add a finished step correctly', () => {
    const initialState = {
      activeProducts: new Set([ProductId.analytics]),
      finishedSteps: {} as Record<CardId, Set<StepId>>,
      activeCards: {
        getSetUp: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            stepsLeft: 1,
            timeInMins: 3,
          },
        },
      } as unknown as Record<SectionId, Record<CardId, ActiveCard>> | null,
    };

    const action: ToggleStepAction = {
      type: GetStartedPageActions.AddFinishedStep,
      payload: {
        cardId: GetSetUpCardId.introduction,
        stepId: IntroductionSteps.watchOverviewVideo,
        sectionId: SectionId.getSetUp,
      },
    };

    const nextState = reducer(initialState, action);

    expect(nextState.finishedSteps[GetSetUpCardId.introduction]).toEqual(
      new Set([IntroductionSteps.watchOverviewVideo])
    );
    expect(nextState.activeCards).toEqual({
      getSetUp: {
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          stepsLeft: 0,
          timeInMins: 0,
        },
      },
    });
  });
});

describe('getFinishedStepsInitialStates', () => {
  it('should return the initial states of finished steps correctly', () => {
    const finishedSteps = {
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo],
      [GetSetUpCardId.bringInYourData]: [],
    } as unknown as Record<CardId, StepId[]>;

    const initialStates = getFinishedStepsInitialStates({ finishedSteps });

    expect(initialStates[GetSetUpCardId.introduction]).toEqual(
      new Set([IntroductionSteps.watchOverviewVideo])
    );
    expect(initialStates[GetSetUpCardId.bringInYourData]).toEqual(new Set([]));
  });
});

describe('getActiveSectionsInitialStates', () => {
  it('should return the initial states of active sections correctly', () => {
    const activeProducts = [ProductId.analytics];

    const initialStates = getActiveSectionsInitialStates({ activeProducts });

    expect(initialStates.has(ProductId.analytics)).toBe(true);
  });
});

describe('getActiveCardsInitialStates', () => {
  it('should return the initial states of active cards correctly', () => {
    const activeProducts = new Set([ProductId.analytics]);
    const finishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
    } as unknown as Record<CardId, Set<StepId>>;

    const initialStates = getActiveCardsInitialStates({ activeProducts, finishedSteps });

    expect(initialStates).toMatchInlineSnapshot(`
      Object {
        "getMoreFromElasticSecurity": Object {
          "masterTheInvestigationsWorkflow": Object {
            "id": "masterTheInvestigationsWorkflow",
            "stepsLeft": 0,
            "timeInMins": 0,
          },
          "optimizeYourWorkSpace": Object {
            "id": "optimizeYourWorkSpace",
            "stepsLeft": 0,
            "timeInMins": 0,
          },
          "respondToThreats": Object {
            "id": "respondToThreats",
            "stepsLeft": 0,
            "timeInMins": 0,
          },
        },
        "getSetUp": Object {
          "activateAndCreateRules": Object {
            "id": "activateAndCreateRules",
            "stepsLeft": 0,
            "timeInMins": 0,
          },
          "bringInYourData": Object {
            "id": "bringInYourData",
            "stepsLeft": 0,
            "timeInMins": 0,
          },
          "introduction": Object {
            "id": "introduction",
            "stepsLeft": 0,
            "timeInMins": 0,
          },
        },
      }
    `);
  });
});
