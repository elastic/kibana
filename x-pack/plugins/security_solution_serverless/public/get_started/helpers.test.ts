/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCardTimeInMinutes,
  getCardStepsLeft,
  isCardActive,
  setupCards,
  updateCard,
} from './helpers';
import type { ActiveCards, Card, CardId, Section, StepId } from './types';
import {
  GetMoreFromElasticSecurityCardId,
  GetSetUpCardId,
  IntroductionSteps,
  SectionId,
} from './types';
import * as sectionsConfigs from './sections';
import { ProductLine } from '../../common/product';
const mockSections = jest.spyOn(sectionsConfigs, 'getSections');
describe('getCardTimeInMinutes', () => {
  it('should calculate the total time in minutes for a card correctly', () => {
    const card = {
      steps: [
        { id: 'step1', timeInMinutes: 30 },
        { id: 'step2', timeInMinutes: 45 },
        { id: 'step3', timeInMinutes: 15 },
      ],
    } as unknown as Card;
    const stepsDone = new Set(['step1', 'step3']) as unknown as Set<StepId>;

    const timeInMinutes = getCardTimeInMinutes(card, stepsDone);

    expect(timeInMinutes).toEqual(45);
  });

  it('should return 0 if the card is null or has no steps', () => {
    const card = {} as Card;
    const stepsDone = new Set(['step1']) as unknown as Set<StepId>;

    const timeInMinutes = getCardTimeInMinutes(card, stepsDone);

    expect(timeInMinutes).toEqual(0);
  });
});

describe('getCardStepsLeft', () => {
  it('should calculate the number of steps left for a card correctly', () => {
    const card = { steps: ['step1', 'step2', 'step3'] } as unknown as Card;
    const stepsDone = new Set(['step1', 'step3']) as unknown as Set<StepId>;

    const stepsLeft = getCardStepsLeft(card, stepsDone);

    expect(stepsLeft).toEqual(1);
  });

  it('should return the total number of steps if the card is null or has no steps', () => {
    const card = {} as Card;
    const stepsDone = new Set() as unknown as Set<StepId>;

    const stepsLeft = getCardStepsLeft(card, stepsDone);

    expect(stepsLeft).toEqual(0);
  });
});

describe('isCardActive', () => {
  it('should return true if the card is active based on the active products', () => {
    const card = { productLineRequired: [ProductLine.security, ProductLine.cloud] } as Card;
    const activeProducts = new Set([ProductLine.security]);

    const isActive = isCardActive(card, activeProducts);

    expect(isActive).toBe(true);
  });

  it('should return true if the card has no product type requirement', () => {
    const card = {} as Card;
    const activeProducts = new Set([ProductLine.security]);

    const isActive = isCardActive(card, activeProducts);

    expect(isActive).toBe(true);
  });

  it('should return false if the card is not active based on the active products', () => {
    const card = { productLineRequired: [ProductLine.security, ProductLine.cloud] } as Card;
    const activeProducts = new Set([ProductLine.endpoint]);

    const isActive = isCardActive(card, activeProducts);

    expect(isActive).toBe(false);
  });
});

describe('setupCards', () => {
  const analyticProductActiveCards = {
    [SectionId.getSetUp]: {
      [GetSetUpCardId.introduction]: {
        id: GetSetUpCardId.introduction,
        timeInMins: 3,
        stepsLeft: 1,
      },
      [GetSetUpCardId.bringInYourData]: {
        id: GetSetUpCardId.bringInYourData,
        timeInMins: 0,
        stepsLeft: 0,
      },
      [GetSetUpCardId.activateAndCreateRules]: {
        id: GetSetUpCardId.activateAndCreateRules,
        timeInMins: 0,
        stepsLeft: 0,
      },
    },
    [SectionId.getMoreFromElasticSecurity]: {
      [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
        id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
        stepsLeft: 0,
        timeInMins: 0,
      },
      [GetMoreFromElasticSecurityCardId.respondToThreats]: {
        id: GetMoreFromElasticSecurityCardId.respondToThreats,
        stepsLeft: 0,
        timeInMins: 0,
      },
      [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
        id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
        stepsLeft: 0,
        timeInMins: 0,
      },
    },
  };
  it('should set up active cards based on active products', () => {
    const finishedSteps = {} as unknown as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.cloud]);

    const activeCards = setupCards(finishedSteps, activeProducts);

    expect(activeCards).toEqual({
      ...analyticProductActiveCards,
      [SectionId.getSetUp]: {
        ...analyticProductActiveCards[SectionId.getSetUp],
        [GetSetUpCardId.protectYourEnvironmentInRealtime]: {
          id: GetSetUpCardId.protectYourEnvironmentInRealtime,
          timeInMins: 0,
          stepsLeft: 0,
        },
      },
    });
  });

  it('should skip inactive cards based on finished steps and active products', () => {
    const finishedSteps = {} as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.security]);

    const activeCards = setupCards(finishedSteps, activeProducts);

    expect(activeCards).toEqual(analyticProductActiveCards);
  });

  it('should return null if there are no active products', () => {
    const finishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
    } as unknown as Record<CardId, Set<StepId>>;

    const activeProducts: Set<ProductLine> = new Set();

    const activeCards = setupCards(finishedSteps, activeProducts);

    expect(activeCards).toBeNull();
  });

  it('should handle null or empty cards in sections', () => {
    mockSections.mockImplementation(() => [
      {
        id: SectionId.getSetUp,
      } as unknown as Section,
    ]);

    const finishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
    } as unknown as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.security]);

    const activeCards = setupCards(finishedSteps, activeProducts);

    expect(activeCards).toEqual({});

    mockSections.mockRestore();
  });
});

describe('updateCard', () => {
  const finishedSteps = {
    [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
  } as unknown as Record<CardId, Set<StepId>>;
  const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);

  const activeCards = {
    [SectionId.getSetUp]: {
      [GetSetUpCardId.introduction]: {
        id: GetSetUpCardId.introduction,
        timeInMins: 3,
        stepsLeft: 1,
      },
      [GetSetUpCardId.bringInYourData]: {
        id: GetSetUpCardId.bringInYourData,
        timeInMins: 0,
        stepsLeft: 0,
      },
      [GetSetUpCardId.activateAndCreateRules]: {
        id: GetSetUpCardId.activateAndCreateRules,
        timeInMins: 0,
        stepsLeft: 0,
      },
      [GetSetUpCardId.protectYourEnvironmentInRealtime]: {
        id: GetSetUpCardId.protectYourEnvironmentInRealtime,
        timeInMins: 0,
        stepsLeft: 0,
      },
    },
    [SectionId.getMoreFromElasticSecurity]: {
      [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
        id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
        stepsLeft: 0,
        timeInMins: 0,
      },
      [GetMoreFromElasticSecurityCardId.respondToThreats]: {
        id: GetMoreFromElasticSecurityCardId.respondToThreats,
        stepsLeft: 0,
        timeInMins: 0,
      },
      [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
        id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
        stepsLeft: 0,
        timeInMins: 0,
      },
    },
  } as ActiveCards;

  it('should update the active card based on finished steps and active products', () => {
    const sectionId = SectionId.getSetUp;
    const cardId = GetSetUpCardId.introduction;

    const updatedCards = updateCard({
      finishedSteps,
      activeProducts,
      activeCards,
      sectionId,
      cardId,
    });

    expect(updatedCards).toEqual({
      ...activeCards,
      [SectionId.getSetUp]: {
        ...activeCards[SectionId.getSetUp],
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          timeInMins: 0,
          stepsLeft: 0,
        },
      },
    });
  });

  it('should return null if the card is inactive based on active products', () => {
    const sectionId = SectionId.getSetUp;
    const cardId = GetSetUpCardId.protectYourEnvironmentInRealtime;

    const updatedCards = updateCard({
      finishedSteps,
      activeProducts,
      activeCards: null,
      sectionId,
      cardId,
    });

    expect(updatedCards).toBeNull();
  });

  it('should return null if the card or activeCards is not found', () => {
    const sectionId = SectionId.getSetUp;
    const cardId = 'test' as CardId;

    const updatedCards = updateCard({
      finishedSteps,
      activeProducts,
      activeCards,
      sectionId,
      cardId,
    });

    expect(updatedCards).toEqual(activeCards);
  });
});
