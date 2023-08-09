/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCardTimeInMinutes,
  getCardStepsLeft,
  setupActiveSections,
  updateActiveSections,
  isStepActive,
} from './helpers';
import type { ActiveSections, Card, CardId, Section, Step, StepId } from './types';
import {
  ExploreSteps,
  ConfigureSteps,
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
    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) => isStepActive(step, activeProducts));
    const stepsDone = new Set(['step1', 'step3']) as unknown as Set<StepId>;

    const timeInMinutes = getCardTimeInMinutes(activeSteps, stepsDone);

    expect(timeInMinutes).toEqual(45);
  });

  it('should return 0 if the card is null or has no steps', () => {
    const card = {} as Card;

    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) => isStepActive(step, activeProducts));
    const stepsDone = new Set(['step1']) as unknown as Set<StepId>;

    const timeInMinutes = getCardTimeInMinutes(activeSteps, stepsDone);

    expect(timeInMinutes).toEqual(0);
  });
});

describe('getCardStepsLeft', () => {
  it('should calculate the number of steps left for a card correctly', () => {
    const card = { steps: ['step1', 'step2', 'step3'] } as unknown as Card;
    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) => isStepActive(step, activeProducts));
    const stepsDone = new Set(['step1', 'step3']) as unknown as Set<StepId>;

    const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);

    expect(stepsLeft).toEqual(1);
  });

  it('should return the total number of steps if the card is null or has no steps', () => {
    const card = {} as Card;
    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) => isStepActive(step, activeProducts));
    const stepsDone = new Set() as unknown as Set<StepId>;

    const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);

    expect(stepsLeft).toEqual(0);
  });
});

describe('isStepActive', () => {
  it('should return true if the step is active based on the active products', () => {
    const step = {
      productLineRequired: [ProductLine.cloud, ProductLine.endpoint],
      id: ConfigureSteps.learnAbout,
    } as Step;
    const activeProducts = new Set([ProductLine.cloud]);

    const isActive = isStepActive(step, activeProducts);

    expect(isActive).toBe(true);
  });

  it('should return true if the card has no product type requirement', () => {
    const step = {
      id: ConfigureSteps.enablePrebuiltRules,
    } as Step;
    const activeProducts = new Set([ProductLine.security]);

    const isActive = isStepActive(step, activeProducts);

    expect(isActive).toBe(true);
  });

  it('should return false if the card is not active based on the active products', () => {
    const step = {
      productLineRequired: [ProductLine.cloud, ProductLine.endpoint],
      id: ConfigureSteps.learnAbout,
    } as Step;
    const activeProducts = new Set([ProductLine.security]);

    const isActive = isStepActive(step, activeProducts);

    expect(isActive).toBe(false);
  });
});

describe('setupActiveSections', () => {
  const getCard = (cardId: CardId, sectionId: SectionId, activeSections: ActiveSections | null) => {
    const section = activeSections ? activeSections[sectionId] : {};
    return section ? section[cardId] ?? { activeStepIds: null } : {};
  };

  it('should set up active steps based on active products', () => {
    const finishedSteps = {} as unknown as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.cloud]);

    const { activeSections } = setupActiveSections(finishedSteps, activeProducts);

    expect(
      getCard(GetSetUpCardId.introduction, SectionId.getSetUp, activeSections).activeStepIds
    ).toEqual([IntroductionSteps.getToKnowElasticSecurity]);

    expect(
      getCard(GetSetUpCardId.configure, SectionId.getSetUp, activeSections).activeStepIds
    ).toEqual([
      ConfigureSteps.learnAbout,
      ConfigureSteps.deployElasticAgent,
      ConfigureSteps.enablePrebuiltRules,
    ]);

    expect(
      getCard(GetSetUpCardId.explore, SectionId.getSetUp, activeSections).activeStepIds
    ).toEqual([ExploreSteps.viewAlerts, ExploreSteps.analyzeData]);
  });

  it('should set up active cards based on finished steps', () => {
    const finishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    } as unknown as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.security]);

    const { activeSections } = setupActiveSections(finishedSteps, activeProducts);

    expect(getCard(GetSetUpCardId.introduction, SectionId.getSetUp, activeSections)).toEqual({
      activeStepIds: [IntroductionSteps.getToKnowElasticSecurity],
      id: GetSetUpCardId.introduction,
      stepsLeft: 0,
      timeInMins: 0,
    });
  });

  it('should return null if there are no active products', () => {
    const finishedSteps = {} as unknown as Record<CardId, Set<StepId>>;

    const activeProducts: Set<ProductLine> = new Set();

    const activeSections = setupActiveSections(finishedSteps, activeProducts);

    expect(activeSections).toEqual({
      activeSections: null,
      totalActiveSteps: null,
      totalStepsLeft: null,
    });
  });

  it('should handle null or empty cards in sections', () => {
    mockSections.mockImplementation(() => [
      {
        id: SectionId.getSetUp,
      } as unknown as Section,
    ]);

    const finishedSteps = {
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    } as unknown as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.security]);

    const activeSections = setupActiveSections(finishedSteps, activeProducts);

    expect(activeSections).toEqual({
      activeSections: {},
      totalActiveSteps: 0,
      totalStepsLeft: 0,
    });

    mockSections.mockRestore();
  });
});

describe('updateActiveSections', () => {
  const finishedSteps = {
    [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
  } as unknown as Record<CardId, Set<StepId>>;

  const activeSections = {
    [SectionId.getSetUp]: {
      [GetSetUpCardId.introduction]: {
        id: GetSetUpCardId.introduction,
        timeInMins: 3,
        stepsLeft: 1,
      },
      [GetSetUpCardId.configure]: {
        id: GetSetUpCardId.configure,
        timeInMins: 0,
        stepsLeft: 4,
      },
      [GetSetUpCardId.explore]: {
        id: GetSetUpCardId.explore,
        timeInMins: 0,
        stepsLeft: 2,
      },
    },
  } as ActiveSections;

  it('should update the active card based on finished steps and active products', () => {
    const activeProducts = new Set([ProductLine.cloud]);
    const sectionId = SectionId.getSetUp;
    const cardId = GetSetUpCardId.introduction;
    const testActiveSections = {
      [SectionId.getSetUp]: {
        [GetSetUpCardId.introduction]: {
          id: GetSetUpCardId.introduction,
          timeInMins: 3,
          stepsLeft: 1,
          activeStepIds: [IntroductionSteps.getToKnowElasticSecurity],
        },
      },
    };
    const updatedSections = updateActiveSections({
      activeProducts,
      activeSections: testActiveSections,
      cardId,
      finishedSteps,
      sectionId,
    });

    expect(updatedSections).toEqual({
      activeSections: {
        ...testActiveSections,
        [SectionId.getSetUp]: {
          ...testActiveSections[SectionId.getSetUp],
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            timeInMins: 0,
            stepsLeft: 0,
            activeStepIds: [IntroductionSteps.getToKnowElasticSecurity],
          },
        },
      },
      totalActiveSteps: 1,
      totalStepsLeft: 0,
    });
  });

  it('should return null if the card is inactive based on active products', () => {
    const activeProducts = new Set([ProductLine.cloud]);
    const sectionId = SectionId.getSetUp;
    const cardId = GetSetUpCardId.introduction;

    const updatedSections = updateActiveSections({
      activeProducts,
      finishedSteps,
      activeSections: null,
      sectionId,
      cardId,
    });

    expect(updatedSections).toEqual({
      activeSections: null,
      totalStepsLeft: null,
      totalActiveSteps: null,
    });
  });

  it('should return null if the card or activeSections is not found', () => {
    const activeProducts = new Set([ProductLine.cloud]);
    const sectionId = SectionId.getSetUp;
    const cardId = 'test' as CardId;

    const updatedSections = updateActiveSections({
      activeProducts,
      finishedSteps,
      activeSections,
      sectionId,
      cardId,
    });

    expect(updatedSections).toEqual({
      activeSections,
      totalStepsLeft: null,
      totalActiveSteps: null,
    });
  });
});
