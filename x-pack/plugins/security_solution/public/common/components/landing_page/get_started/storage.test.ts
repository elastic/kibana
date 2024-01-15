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
  getStartedStorage,
} from './storage';
import { CreateProjectSteps, OverviewSteps, QuickStartSectionCardsId, type StepId } from './types';
import { storage } from '../common/lib/storage';
import type { MockStorage } from '../common/lib/__mocks__/storage';
import { ProductLine } from '../../common/product';
import { defaultFinishedSteps } from './helpers';

jest.mock('../common/lib/storage');

describe('useStorage', () => {
  const mockStorage = storage as unknown as MockStorage;
  beforeEach(() => {
    // Clear the mocked storage object before each test
    mockStorage.clearMockStorageData();
    jest.clearAllMocks();
  });

  it('should return the active products from storage', () => {
    expect(getStartedStorage.getActiveProductsFromStorage()).toEqual([]);

    mockStorage.set(ACTIVE_PRODUCTS_STORAGE_KEY, [ProductLine.security, ProductLine.endpoint]);
    expect(getStartedStorage.getActiveProductsFromStorage()).toEqual([
      ProductLine.security,
      ProductLine.endpoint,
    ]);
  });

  it('should toggle active products in storage', () => {
    expect(getStartedStorage.toggleActiveProductsInStorage(ProductLine.security)).toEqual([
      ProductLine.security,
    ]);
    expect(mockStorage.set).toHaveBeenCalledWith(ACTIVE_PRODUCTS_STORAGE_KEY, [
      ProductLine.security,
    ]);

    mockStorage.set(ACTIVE_PRODUCTS_STORAGE_KEY, [ProductLine.security]);
    expect(getStartedStorage.toggleActiveProductsInStorage(ProductLine.security)).toEqual([]);
    expect(mockStorage.set).toHaveBeenCalledWith(ACTIVE_PRODUCTS_STORAGE_KEY, []);
  });

  it('should return the finished steps from storage by card ID', () => {
    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.createFirstProject
      )
    ).toEqual([CreateProjectSteps.createFirstProject]);

    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.createFirstProject
      )
    ).toEqual([CreateProjectSteps.createFirstProject, 'step2']);
  });

  it('should return all finished steps from storage', () => {
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual(defaultFinishedSteps);

    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
    });
  });

  it('should add a finished step to storage', () => {
    getStartedStorage.addFinishedStepToStorage(
      QuickStartSectionCardsId.createFirstProject,
      CreateProjectSteps.createFirstProject
    );
    expect(mockStorage.set).toHaveBeenCalledWith(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
    });

    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
    });
    getStartedStorage.addFinishedStepToStorage(
      QuickStartSectionCardsId.createFirstProject,
      'step2' as StepId
    );
    expect(mockStorage.set).toHaveBeenCalledWith(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });
  });

  it('should get finished steps from storage by card ID', () => {
    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.createFirstProject
      )
    ).toEqual([CreateProjectSteps.createFirstProject, 'step2']);

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(
        QuickStartSectionCardsId.watchTheOverviewVideo
      )
    ).toEqual(['step3']);
  });

  it('should get all finished steps from storage', () => {
    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
      card3: ['step4'],
    });

    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
      [QuickStartSectionCardsId.watchTheOverviewVideo]: ['step3'],
      card3: ['step4'],
    });

    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {});
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual(defaultFinishedSteps);
  });

  it('should remove a finished step from storage', () => {
    getStartedStorage.removeFinishedStepFromStorage(
      QuickStartSectionCardsId.createFirstProject,
      'step2' as StepId
    );
    expect(mockStorage.set).toHaveBeenCalledWith(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [CreateProjectSteps.createFirstProject],
    });
  });

  it('should not remove a default finished step from storage', () => {
    mockStorage.set(FINISHED_STEPS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });

    getStartedStorage.removeFinishedStepFromStorage(
      QuickStartSectionCardsId.createFirstProject,
      CreateProjectSteps.createFirstProject
    );
    expect(mockStorage.get(FINISHED_STEPS_STORAGE_KEY)).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: [
        CreateProjectSteps.createFirstProject,
        'step2',
      ],
    });
  });

  it('should get all expanded card steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: true,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
    const result = getStartedStorage.getAllExpandedCardStepsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith(EXPANDED_CARDS_STORAGE_KEY);
    expect(result).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: true,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
  });

  it('should get default expanded card steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce(null);
    const result = getStartedStorage.getAllExpandedCardStepsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith(EXPANDED_CARDS_STORAGE_KEY);
    expect(result).toEqual(defaultExpandedCards);
  });

  it('should reset card steps in storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.resetAllExpandedCardStepsToStorage();
    expect(mockStorage.get(EXPANDED_CARDS_STORAGE_KEY)).toEqual({
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [],
      },
    });
  });

  it('should add a step to expanded card steps in storage', () => {
    mockStorage.set(EXPANDED_CARDS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: false,
        expandedSteps: [],
      },
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.addExpandedCardStepToStorage(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.get(EXPANDED_CARDS_STORAGE_KEY)).toEqual({
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
    mockStorage.set(EXPANDED_CARDS_STORAGE_KEY, {
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: true,
        expandedSteps: [OverviewSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.removeExpandedCardStepFromStorage(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.get(EXPANDED_CARDS_STORAGE_KEY)).toEqual({
      [QuickStartSectionCardsId.watchTheOverviewVideo]: {
        isExpanded: false,
        expandedSteps: [],
      },
    });
  });

  it('should update a card from expanded card steps in storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: true,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
    getStartedStorage.removeExpandedCardStepFromStorage(
      QuickStartSectionCardsId.createFirstProject
    );
    expect(mockStorage.set).toHaveBeenCalledWith(EXPANDED_CARDS_STORAGE_KEY, {
      [QuickStartSectionCardsId.createFirstProject]: {
        isExpanded: false,
        expandedSteps: [CreateProjectSteps.createFirstProject],
      },
    });
  });
});
