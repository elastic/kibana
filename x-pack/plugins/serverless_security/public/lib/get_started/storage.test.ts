/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStartedStorage } from './storage';
import {
  GetSetUpCardId,
  IntroductionSteps,
  ProductId,
  StepId,
} from '../../components/get_started/types';
import { storage as mockStorage } from '../storage';
import { clearMockStorageData } from '../__mocks__/storage';

jest.mock('../storage');

describe('useStorage', () => {
  beforeEach(() => {
    // Clear the mocked storage object before each test
    clearMockStorageData();
    jest.clearAllMocks();
  });

  it('should return the active products from storage', () => {
    expect(getStartedStorage.getActiveProductsFromStorage()).toEqual({});

    mockStorage.set('ACTIVE_PRODUCTS', { product1: true, product2: true });
    expect(getStartedStorage.getActiveProductsFromStorage()).toEqual({
      product1: true,
      product2: true,
    });
  });

  it('should toggle active products in storage', () => {
    expect(getStartedStorage.toggleActiveProductsInStorage(ProductId.analytics)).toEqual({
      [ProductId.analytics]: true,
    });
    expect(mockStorage.set).toHaveBeenCalledWith('ACTIVE_PRODUCTS', {
      [ProductId.analytics]: true,
    });

    mockStorage.set('ACTIVE_PRODUCTS', { [ProductId.analytics]: true });
    expect(getStartedStorage.toggleActiveProductsInStorage(ProductId.analytics)).toEqual({});
    expect(mockStorage.set).toHaveBeenCalledWith('ACTIVE_PRODUCTS', {});
  });

  it('should return the finished steps from storage by card ID', () => {
    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual({});

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual({ [IntroductionSteps.watchOverviewVideo]: true, step2: true });
  });

  it('should return all finished steps from storage', () => {
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({});

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
      card2: { step3: true },
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
      card2: { step3: true },
    });
  });

  it('should add a finished step to storage', () => {
    getStartedStorage.addFinishedStepToStorage(
      GetSetUpCardId.introduction,
      IntroductionSteps.watchOverviewVideo
    );
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: { [IntroductionSteps.watchOverviewVideo]: true },
    });

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: { [IntroductionSteps.watchOverviewVideo]: true },
    });
    getStartedStorage.addFinishedStepToStorage(GetSetUpCardId.introduction, 'step2' as StepId);
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
    });
  });

  it('should get finished steps from storage by card ID', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
      card2: { step3: true },
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual({ [IntroductionSteps.watchOverviewVideo]: true, step2: true });

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
      card2: { step3: true },
    });
    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual({ step3: true });
  });

  it('should get all finished steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
      card2: { step3: true },
      card3: { step4: true },
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
      card2: { step3: true },
      card3: { step4: true },
    });

    (mockStorage.get as jest.Mock).mockReturnValueOnce({});
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({});
  });

  it('should remove a finished step from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: {
        [IntroductionSteps.watchOverviewVideo]: true,
        step2: true,
      },
    });
    getStartedStorage.removeFinishedStep(
      GetSetUpCardId.introduction,
      IntroductionSteps.watchOverviewVideo
    );
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: { step2: true },
    });

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: { step2: true },
    });
    getStartedStorage.removeFinishedStep(GetSetUpCardId.introduction, 'step2' as StepId);
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: {},
    });
  });
});
