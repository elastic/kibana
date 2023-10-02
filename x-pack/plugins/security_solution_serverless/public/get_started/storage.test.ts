/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultExpandedCards, getStartedStorage } from './storage';
import { ConfigureSteps, GetSetUpCardId, IntroductionSteps, type StepId } from './types';
import { storage } from '../common/lib/storage';
import type { MockStorage } from '../common/lib/__mocks__/storage';
import { ProductLine } from '../../common/product';

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

    mockStorage.set('ACTIVE_PRODUCTS', ['product1', 'product2']);
    expect(getStartedStorage.getActiveProductsFromStorage()).toEqual(['product1', 'product2']);
  });

  it('should toggle active products in storage', () => {
    expect(getStartedStorage.toggleActiveProductsInStorage(ProductLine.security)).toEqual([
      ProductLine.security,
    ]);
    expect(mockStorage.set).toHaveBeenCalledWith('ACTIVE_PRODUCTS', [ProductLine.security]);

    mockStorage.set('ACTIVE_PRODUCTS', [ProductLine.security]);
    expect(getStartedStorage.toggleActiveProductsInStorage(ProductLine.security)).toEqual([]);
    expect(mockStorage.set).toHaveBeenCalledWith('ACTIVE_PRODUCTS', []);
  });

  it('should return the finished steps from storage by card ID', () => {
    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual([]);

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual([IntroductionSteps.getToKnowElasticSecurity, 'step2']);
  });

  it('should return all finished steps from storage', () => {
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({});

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
      [GetSetUpCardId.configure]: ['step3'],
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
      [GetSetUpCardId.configure]: ['step3'],
    });
  });

  it('should add a finished step to storage', () => {
    getStartedStorage.addFinishedStepToStorage(
      GetSetUpCardId.introduction,
      IntroductionSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity],
    });

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity],
    });
    getStartedStorage.addFinishedStepToStorage(GetSetUpCardId.introduction, 'step2' as StepId);
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
    });
  });

  it('should get finished steps from storage by card ID', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
      [GetSetUpCardId.configure]: ['step3'],
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual([IntroductionSteps.getToKnowElasticSecurity, 'step2']);

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
      [GetSetUpCardId.configure]: ['step3'],
    });
    expect(getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.configure)).toEqual(
      ['step3']
    );
  });

  it('should get all finished steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
      [GetSetUpCardId.configure]: ['step3'],
      card3: ['step4'],
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
      [GetSetUpCardId.configure]: ['step3'],
      card3: ['step4'],
    });

    (mockStorage.get as jest.Mock).mockReturnValueOnce({});
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({});
  });

  it('should remove a finished step from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.getToKnowElasticSecurity, 'step2'],
    });
    getStartedStorage.removeFinishedStepFromStorage(
      GetSetUpCardId.introduction,
      IntroductionSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: ['step2'],
    });

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: ['step2'],
    });
    getStartedStorage.removeFinishedStepFromStorage(GetSetUpCardId.introduction, 'step2' as StepId);
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [],
    });
  });

  it('should get all expanded card steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
    const result = getStartedStorage.getAllExpandedCardStepsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith('EXPANDED_CARDS');
    expect(result).toEqual({
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
  });

  it('should get default expanded card steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce(null);
    const result = getStartedStorage.getAllExpandedCardStepsFromStorage();
    expect(mockStorage.get).toHaveBeenCalledWith('EXPANDED_CARDS');
    expect(result).toEqual(defaultExpandedCards);
  });

  it('should reset card steps in storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.resetAllExpandedCardStepsToStorage();
    expect(mockStorage.set).toHaveBeenCalledWith('EXPANDED_CARDS', {
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [],
      },
    });
  });

  it('should add a step to expanded card steps in storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.addExpandedCardStepToStorage(
      GetSetUpCardId.configure,
      ConfigureSteps.learnAbout
    );
    expect(mockStorage.set).toHaveBeenCalledWith('EXPANDED_CARDS', {
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
      [GetSetUpCardId.configure]: {
        isExpanded: true,
        expandedSteps: [ConfigureSteps.learnAbout],
      },
    });
  });

  it('should remove a step from expanded card steps in storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.removeExpandedCardStepFromStorage(
      GetSetUpCardId.introduction,
      IntroductionSteps.getToKnowElasticSecurity
    );
    expect(mockStorage.set).toHaveBeenCalledWith('EXPANDED_CARDS', {
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [],
      },
    });
  });

  it('should update a card from expanded card steps in storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        isExpanded: true,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
    getStartedStorage.removeExpandedCardStepFromStorage(GetSetUpCardId.introduction);
    expect(mockStorage.set).toHaveBeenCalledWith('EXPANDED_CARDS', {
      [GetSetUpCardId.introduction]: {
        isExpanded: false,
        expandedSteps: [IntroductionSteps.getToKnowElasticSecurity],
      },
    });
  });
});
