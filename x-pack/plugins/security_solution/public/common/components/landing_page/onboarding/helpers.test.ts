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
  isDefaultFinishedCardStep,
} from './helpers';
import type { ActiveSections, Card, CardId, Section, Step, StepId } from './types';

import {
  AddAndValidateYourDataCardsId,
  AddIntegrationsSteps,
  CreateProjectSteps,
  EnablePrebuiltRulesSteps,
  OverviewSteps,
  QuickStartSectionCardsId,
  SectionId,
  GetStartedWithAlertsCardsId,
  ViewAlertsSteps,
  ViewDashboardSteps,
} from './types';

import * as sectionsConfigs from './sections';
import { ProductLine } from './configs';
const mockSections = jest.spyOn(sectionsConfigs, 'getSections');

const onboardingSteps = [
  CreateProjectSteps.createFirstProject,
  OverviewSteps.getToKnowElasticSecurity,
  AddIntegrationsSteps.connectToDataSources,
  ViewDashboardSteps.analyzeData,
  EnablePrebuiltRulesSteps.enablePrebuiltRules,
  ViewAlertsSteps.viewAlerts,
];

describe('getCardTimeInMinutes', () => {
  it('should calculate the total time in minutes for a card correctly', () => {
    const card = {
      steps: [
        { id: CreateProjectSteps.createFirstProject, timeInMinutes: 30 },
        { id: OverviewSteps.getToKnowElasticSecurity, timeInMinutes: 45 },
        { id: AddIntegrationsSteps.connectToDataSources, timeInMinutes: 15 },
      ],
    } as unknown as Card;
    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) =>
      isStepActive(step, activeProducts, onboardingSteps)
    );
    const stepsDone = new Set([
      CreateProjectSteps.createFirstProject,
      AddIntegrationsSteps.connectToDataSources,
    ]) as unknown as Set<StepId>;

    const timeInMinutes = getCardTimeInMinutes(activeSteps, stepsDone);

    expect(timeInMinutes).toEqual(45);
  });

  it('should return 0 if the card is null or has no steps', () => {
    const card = {} as Card;

    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) =>
      isStepActive(step, activeProducts, onboardingSteps)
    );
    const stepsDone = new Set(['step1']) as unknown as Set<StepId>;

    const timeInMinutes = getCardTimeInMinutes(activeSteps, stepsDone);

    expect(timeInMinutes).toEqual(0);
  });
});

describe('getCardStepsLeft', () => {
  it('should calculate the number of steps left for a card correctly', () => {
    const card = {
      steps: [
        { id: CreateProjectSteps.createFirstProject },
        { id: OverviewSteps.getToKnowElasticSecurity },
        { id: AddIntegrationsSteps.connectToDataSources },
      ],
    } as unknown as Card;
    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) =>
      isStepActive(step, activeProducts, onboardingSteps)
    );
    const stepsDone = new Set([
      CreateProjectSteps.createFirstProject,
      AddIntegrationsSteps.connectToDataSources,
    ]) as unknown as Set<StepId>;

    const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);

    expect(stepsLeft).toEqual(1);
  });

  it('should return the total number of steps if the card is null or has no steps', () => {
    const card = {} as Card;
    const activeProducts = new Set([ProductLine.security, ProductLine.cloud]);
    const activeSteps = card.steps?.filter((step) =>
      isStepActive(step, activeProducts, onboardingSteps)
    );
    const stepsDone = new Set() as unknown as Set<StepId>;

    const stepsLeft = getCardStepsLeft(activeSteps, stepsDone);

    expect(stepsLeft).toEqual(0);
  });
});

describe('isStepActive', () => {
  it('should return true if the step is active based on the active products', () => {
    const step = {
      productLineRequired: [ProductLine.cloud, ProductLine.endpoint],
      id: OverviewSteps.getToKnowElasticSecurity,
    } as Step;
    const activeProducts = new Set([ProductLine.cloud]);

    const isActive = isStepActive(step, activeProducts, onboardingSteps);

    expect(isActive).toBe(true);
  });

  it('should return true if the card has no product type requirement', () => {
    const step = {
      id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
    } as Step;
    const activeProducts = new Set([ProductLine.security]);

    const isActive = isStepActive(step, activeProducts, onboardingSteps);

    expect(isActive).toBe(true);
  });

  it('should return false if the card is not active based on the active products', () => {
    const step = {
      productLineRequired: [ProductLine.cloud, ProductLine.endpoint],
      id: OverviewSteps.getToKnowElasticSecurity,
    } as Step;
    const activeProducts = new Set([ProductLine.security]);

    const isActive = isStepActive(step, activeProducts, onboardingSteps);

    expect(isActive).toBe(false);
  });

  it('should return false if it is not included in the onboardingSteps', () => {
    const step = {
      id: CreateProjectSteps.createFirstProject,
    };
    const activeProducts = new Set([ProductLine.cloud]);

    const isActive = isStepActive(step, activeProducts, [
      OverviewSteps.getToKnowElasticSecurity,
      AddIntegrationsSteps.connectToDataSources,
      ViewDashboardSteps.analyzeData,
      EnablePrebuiltRulesSteps.enablePrebuiltRules,
      ViewAlertsSteps.viewAlerts,
    ]);

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
    const { activeSections } = setupActiveSections(finishedSteps, activeProducts, onboardingSteps);

    expect(
      getCard(QuickStartSectionCardsId.createFirstProject, SectionId.quickStart, activeSections)
        .activeStepIds
    ).toEqual([CreateProjectSteps.createFirstProject]);

    expect(
      getCard(QuickStartSectionCardsId.watchTheOverviewVideo, SectionId.quickStart, activeSections)
        .activeStepIds
    ).toEqual([OverviewSteps.getToKnowElasticSecurity]);

    expect(
      getCard(
        AddAndValidateYourDataCardsId.addIntegrations,
        SectionId.addAndValidateYourData,
        activeSections
      ).activeStepIds
    ).toEqual([AddIntegrationsSteps.connectToDataSources]);

    expect(
      getCard(
        AddAndValidateYourDataCardsId.viewDashboards,
        SectionId.addAndValidateYourData,
        activeSections
      ).activeStepIds
    ).toEqual([ViewDashboardSteps.analyzeData]);

    expect(
      getCard(
        GetStartedWithAlertsCardsId.enablePrebuiltRules,
        SectionId.getStartedWithAlerts,
        activeSections
      ).activeStepIds
    ).toEqual([EnablePrebuiltRulesSteps.enablePrebuiltRules]);

    expect(
      getCard(
        GetStartedWithAlertsCardsId.viewAlerts,
        SectionId.getStartedWithAlerts,
        activeSections
      ).activeStepIds
    ).toEqual([ViewAlertsSteps.viewAlerts]);
  });

  it('should set up active cards based on finished steps', () => {
    const finishedSteps = {
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    } as unknown as Record<CardId, Set<StepId>>;
    const activeProducts = new Set([ProductLine.security]);

    const { activeSections } = setupActiveSections(finishedSteps, activeProducts, onboardingSteps);

    expect(
      getCard(QuickStartSectionCardsId.createFirstProject, SectionId.quickStart, activeSections)
    ).toEqual({
      activeStepIds: [CreateProjectSteps.createFirstProject],
      id: QuickStartSectionCardsId.createFirstProject,
      stepsLeft: 0,
      timeInMins: 0,
    });
  });

  it('should return null if there are no active products', () => {
    const finishedSteps = {} as unknown as Record<CardId, Set<StepId>>;

    const activeProducts: Set<ProductLine> = new Set();

    const activeSections = setupActiveSections(finishedSteps, activeProducts, onboardingSteps);

    expect(activeSections).toEqual({
      activeSections: null,
      totalActiveSteps: null,
      totalStepsLeft: null,
    });
  });

  it('should handle null or empty cards in sections', () => {
    mockSections.mockImplementation(() => [
      {
        id: SectionId.quickStart,
      } as unknown as Section,
    ]);

    const finishedSteps = {
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    } as unknown as Record<CardId, Set<StepId>>;
    const activeProducts: Set<ProductLine> = new Set([ProductLine.security]);

    const activeSections = setupActiveSections(finishedSteps, activeProducts, onboardingSteps);

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
    [QuickStartSectionCardsId.createFirstProject]: new Set([CreateProjectSteps.createFirstProject]),
  } as unknown as Record<CardId, Set<StepId>>;

  const activeSections = {
    [SectionId.quickStart]: {
      [QuickStartSectionCardsId.createFirstProject]: {
        id: QuickStartSectionCardsId.createFirstProject,
        stepsLeft: 0,
      },
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        id: QuickStartSectionCardsId.watchTheOverviewVideo,
        stepsLeft: 1,
      },
    },
  } as ActiveSections;

  it('should update the active card based on finished steps and active products', () => {
    const activeProducts = new Set([ProductLine.cloud]);
    const sectionId = SectionId.quickStart;
    const cardId = QuickStartSectionCardsId.createFirstProject;
    const testActiveSections = {
      [SectionId.quickStart]: {
        [QuickStartSectionCardsId.createFirstProject]: {
          id: QuickStartSectionCardsId.createFirstProject,
          stepsLeft: 0,
          timeInMins: 0,
          activeStepIds: [CreateProjectSteps.createFirstProject],
        },
      },
    };
    const updatedSections = updateActiveSections({
      activeProducts,
      activeSections: testActiveSections,
      cardId,
      finishedSteps,
      onboardingSteps,
      sectionId,
    });

    expect(updatedSections).toEqual({
      activeSections: {
        ...testActiveSections,
        [SectionId.quickStart]: {
          ...testActiveSections[SectionId.quickStart],
          [QuickStartSectionCardsId.createFirstProject]: {
            id: QuickStartSectionCardsId.createFirstProject,
            timeInMins: 0,
            stepsLeft: 0,
            activeStepIds: [CreateProjectSteps.createFirstProject],
          },
        },
      },
      totalActiveSteps: 1,
      totalStepsLeft: 0,
    });
  });

  it('should return null if the card is inactive based on active products', () => {
    const activeProducts = new Set([ProductLine.cloud]);
    const sectionId = SectionId.quickStart;
    const cardId = QuickStartSectionCardsId.createFirstProject;

    const updatedSections = updateActiveSections({
      activeProducts,
      finishedSteps,
      onboardingSteps,
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
    const sectionId = SectionId.quickStart;
    const cardId = 'test' as CardId;

    const updatedSections = updateActiveSections({
      activeProducts,
      finishedSteps,
      onboardingSteps,
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

describe('isDefaultFinishedCardStep', () => {
  it('should return true if the card is a default finished card', () => {
    const cardId = QuickStartSectionCardsId.createFirstProject;
    const stepId = CreateProjectSteps.createFirstProject;

    const isDefaultFinished = isDefaultFinishedCardStep(cardId, stepId, onboardingSteps);

    expect(isDefaultFinished).toBe(true);
  });

  it('should return false if the card is not included in default finished steps', () => {
    const cardId = QuickStartSectionCardsId.createFirstProject;
    const stepId = OverviewSteps.getToKnowElasticSecurity;

    const isDefaultFinished = isDefaultFinishedCardStep(cardId, stepId, onboardingSteps);

    expect(isDefaultFinished).toBe(false);
  });

  it('should return false if the step is not included in the onboarding steps', () => {
    const cardId = QuickStartSectionCardsId.createFirstProject;
    const stepId = CreateProjectSteps.createFirstProject;

    const isDefaultFinished = isDefaultFinishedCardStep(cardId, stepId, [
      OverviewSteps.getToKnowElasticSecurity,
      AddIntegrationsSteps.connectToDataSources,
      ViewDashboardSteps.analyzeData,
      EnablePrebuiltRulesSteps.enablePrebuiltRules,
      ViewAlertsSteps.viewAlerts,
    ]);

    expect(isDefaultFinished).toBe(false);
  });
});
