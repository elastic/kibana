/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTIVE_PRODUCTS_STORAGE_KEY,
  defaultExpandedCards,
  EXPANDED_CARDS_STORAGE_KEY,
  FINISHED_STEPS_STORAGE_KEY,
  getStorageKeyBySpace,
  OnboardingStorage,
} from './storage';
import {
  AddIntegrationsSteps,
  CreateProjectSteps,
  EnablePrebuiltRulesSteps,
  OverviewSteps,
  QuickStartSectionCardsId,
  ViewAlertsSteps,
  ViewDashboardSteps,
  type StepId,
} from './types';
import { DEFAULT_FINISHED_STEPS } from './helpers';
import type { MockStorage } from '../../../lib/local_storage/__mocks__';
import { storage } from '../../../lib/local_storage';
import { ProductLine } from './configs';

jest.mock('../../../lib/local_storage');

describe.each([['test'], [undefined]])('useStorage - spaceId: %s', (spaceId) => {
  const mockStorage = storage as unknown as MockStorage;
  const onboardingStorage = new OnboardingStorage(spaceId);
  const onboardingSteps = [
    CreateProjectSteps.createFirstProject,
    OverviewSteps.getToKnowElasticSecurity,
    AddIntegrationsSteps.connectToDataSources,
    ViewDashboardSteps.analyzeData,
    EnablePrebuiltRulesSteps.enablePrebuiltRules,
    ViewAlertsSteps.viewAlerts,
  ];
  beforeEach(() => {
    // Clear the mocked storage object before each test
    mockStorage.clearMockStorageData();
    jest.clearAllMocks();
  });

  it('should return the active products from storage', () => {
    expect(onboardingStorage.getActiveProductsFromStorage()).toEqual([]);
    const activeProductsStorageKey = getStorageKeyBySpace(ACTIVE_PRODUCTS_STORAGE_KEY, spaceId);

    mockStorage.set(activeProductsStorageKey, [ProductLine.security, ProductLine.endpoint]);
    expect(onboardingStorage.getActiveProductsFromStorage()).toEqual([
      ProductLine.security,
      ProductLine.endpoint,
    ]);
  });

  it('should toggle active products in storage', () => {
    const activeProductsStorageKey = getStorageKeyBySpace(ACTIVE_PRODUCTS_STORAGE_KEY, spaceId);

    expect(onboardingStorage.toggleActiveProductsInStorage(ProductLine.security)).toEqual([
      ProductLine.security,
    ]);
    expect(mockStorage.set).toHaveBeenCalledWith(activeProductsStorageKey, [ProductLine.security]);

    mockStorage.set(activeProductsStorageKey, [ProductLine.security]);
    expect(onboardingStorage.toggleActiveProductsInStorage(ProductLine.security)).toEqual([]);
    expect(mockStorage.set).toHaveBeenCalledWith(activeProductsStorageKey, []);
  });

  it('should return the finished steps from storage by card ID', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    expect(
      onboardingStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.createFirstProject
      )
    ).toEqual([CreateProjectSteps.createFirstProject]);

    mockStorage.set(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });

    expect(
      onboardingStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.createFirstProject
      )
    ).toEqual([CreateProjectSteps.createFirstProject, 'step2']);
  });

  it('should return all finished steps from storage', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    expect(onboardingStorage.getAllFinishedStepsFromStorage()).toEqual(DEFAULT_FINISHED_STEPS);

    mockStorage.set(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
    });
    expect(onboardingStorage.getAllFinishedStepsFromStorage()).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
    });
  });

  it('should add a finished step to storage', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    onboardingStorage.addFinishedStepToStorage(
      QuickStartSectionCardsId.createFirstProject,
      CreateProjectSteps.createFirstProject
    );
    expect(mockStorage.set).toHaveBeenCalledWith(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
    });

    mockStorage.set(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
    });
    onboardingStorage.addFinishedStepToStorage(
      QuickStartSectionCardsId.createFirstProject,
      'step2' as StepId
    );
    expect(mockStorage.set).toHaveBeenCalledWith(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });
  });

  it('should get finished steps from storage by card ID', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    mockStorage.set(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
    });

    expect(
      onboardingStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.createFirstProject
      )
    ).toEqual([CreateProjectSteps.createFirstProject, 'step2']);

    expect(
      onboardingStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.watchTheOverviewVideo
      )
    ).toEqual(['step3']);
  });

  it('should get all finished steps from storage', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    mockStorage.set(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
      card3: ['step4'],
    });

    expect(onboardingStorage.getAllFinishedStepsFromStorage()).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
      card3: ['step4'],
    });

    mockStorage.set(finishedStepsStorageKey, {});
    expect(onboardingStorage.getAllFinishedStepsFromStorage()).toEqual(DEFAULT_FINISHED_STEPS);
  });

  it('should remove a finished step from storage', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    onboardingStorage.removeFinishedStepFromStorage(
      QuickStartSectionCardsId.createFirstProject,
      'step2' as StepId,
      onboardingSteps
    );
    expect(mockStorage.set).toHaveBeenCalledWith(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
    });
  });

  it('should not remove a default finished step from storage', () => {
    const finishedStepsStorageKey = getStorageKeyBySpace(FINISHED_STEPS_STORAGE_KEY, spaceId);

    mockStorage.set(finishedStepsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });

    onboardingStorage.removeFinishedStepFromStorage(
      QuickStartSectionCardsId.createFirstProject,
      CreateProjectSteps.createFirstProject,
      onboardingSteps
    );
    expect(mockStorage.get(finishedStepsStorageKey)).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });
  });

  it('should get all expanded card steps from storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: true,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
    const result = onboardingStorage.getAllExpandedCardStepsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith(expandedCardsStorageKey);
    expect(result).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: true,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
  });

  it('should get default expanded card steps from storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce(null);
    const result = onboardingStorage.getAllExpandedCardStepsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith(expandedCardsStorageKey);
    expect(result).toEqual(defaultExpandedCards);
  });

  it('should reset card steps in storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
    onboardingStorage.resetAllExpandedCardStepsToStorage();
    expect(mockStorage.get(expandedCardsStorageKey)).toEqual({
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [],
      },
    });
  });

  it('should add a step to expanded card steps in storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    mockStorage.set(expandedCardsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: false,
        expandedSteps: [],
      },
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
    onboardingStorage.addExpandedCardStepToStorage(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.get(expandedCardsStorageKey)).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: false,
        expandedSteps: [],
      },
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: true,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
  });

  it('should remove a step from expanded card steps in storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    mockStorage.set(expandedCardsStorageKey, {
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: true,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
    onboardingStorage.removeExpandedCardStepFromStorage(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.get(expandedCardsStorageKey)).toEqual({
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [],
      },
    });
  });

  it('should update a card from expanded card steps in storage', () => {
    const expandedCardsStorageKey = getStorageKeyBySpace(EXPANDED_CARDS_STORAGE_KEY, spaceId);

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: true,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
    onboardingStorage.removeExpandedCardStepFromStorage(
      QuickStartSectionCardsId.createFirstProject
    );
    expect(mockStorage.set).toHaveBeenCalledWith(expandedCardsStorageKey, {
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: false,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
  });
});
