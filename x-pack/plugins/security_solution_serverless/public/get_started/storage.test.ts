/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStartedStorage } from './storage';
import { GetSetUpCardId, IntroductionSteps, type StepId } from './types';
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
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual([IntroductionSteps.watchOverviewVideo, 'step2']);
  });

  it('should return all finished steps from storage', () => {
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({});

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
      [GetSetUpCardId.bringInYourData]: ['step3'],
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
      [GetSetUpCardId.bringInYourData]: ['step3'],
    });
  });

  it('should add a finished step to storage', () => {
    getStartedStorage.addFinishedStepToStorage(
      GetSetUpCardId.introduction,
      IntroductionSteps.watchOverviewVideo
    );
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo],
    });

    mockStorage.set('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo],
    });
    getStartedStorage.addFinishedStepToStorage(GetSetUpCardId.introduction, 'step2' as StepId);
    expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
    });
  });

  it('should get finished steps from storage by card ID', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
      [GetSetUpCardId.bringInYourData]: ['step3'],
    });

    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.introduction)
    ).toEqual([IntroductionSteps.watchOverviewVideo, 'step2']);

    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
      [GetSetUpCardId.bringInYourData]: ['step3'],
    });
    expect(
      getStartedStorage.getFinishedStepsFromStorageByCardId(GetSetUpCardId.bringInYourData)
    ).toEqual(['step3']);
  });

  it('should get all finished steps from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
      [GetSetUpCardId.bringInYourData]: ['step3'],
      card3: ['step4'],
    });
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
      [GetSetUpCardId.bringInYourData]: ['step3'],
      card3: ['step4'],
    });

    (mockStorage.get as jest.Mock).mockReturnValueOnce({});
    expect(getStartedStorage.getAllFinishedStepsFromStorage()).toEqual({});
  });

  it('should remove a finished step from storage', () => {
    (mockStorage.get as jest.Mock).mockReturnValueOnce({
      [GetSetUpCardId.introduction]: [IntroductionSteps.watchOverviewVideo, 'step2'],
    });
    getStartedStorage.removeFinishedStepFromStorage(
      GetSetUpCardId.introduction,
      IntroductionSteps.watchOverviewVideo
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
});
