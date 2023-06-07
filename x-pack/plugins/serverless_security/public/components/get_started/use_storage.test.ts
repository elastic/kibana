/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

import { useStorage } from './use_storage';
import { CardId, GetSetUpCardId, IntroductionSteps, ProductId, StepId } from './types';
let data: Record<string, unknown> = {};
const mockStorage = {
  get: jest.fn((key: string) => data[key]),
  set: jest.fn((key, value) => {
    data[key] = value;
  }),
} as unknown as Storage;

describe('useStorage', () => {
  beforeEach(() => {
    // Clear the mocked storage object before each test
    data = {};
  });

  it('should return the active products from storage', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      const activeProducts = result.current.getActiveProductsFromStorage();
      expect(activeProducts).toEqual({});
    });

    act(() => {
      mockStorage.set('ACTIVE_PRODUCTS', { product1: true, product2: true });
      const activeProducts = result.current.getActiveProductsFromStorage();
      expect(activeProducts).toEqual({ product1: true, product2: true });
    });
  });

  it('should toggle active products in storage', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      const activeProducts = result.current.toggleActiveProductsInStorage(ProductId.analytics);
      expect(activeProducts).toEqual({ [ProductId.analytics]: true });
      expect(mockStorage.set).toHaveBeenCalledWith('ACTIVE_PRODUCTS', {
        [ProductId.analytics]: true,
      });
    });

    act(() => {
      mockStorage.set('ACTIVE_PRODUCTS', { [ProductId.analytics]: true });
      const activeProducts = result.current.toggleActiveProductsInStorage(ProductId.analytics);
      expect(activeProducts).toEqual({});
      expect(mockStorage.set).toHaveBeenCalledWith('ACTIVE_PRODUCTS', {});
    });
  });

  it('should return the finished steps from storage by card ID', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      const finishedSteps = result.current.getFinishedStepsFromStorageByCardId(
        GetSetUpCardId.introduction
      );
      expect(finishedSteps).toEqual({});
    });

    act(() => {
      mockStorage.set('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
      });
      const finishedSteps = result.current.getFinishedStepsFromStorageByCardId(
        GetSetUpCardId.introduction
      );
      expect(finishedSteps).toEqual({ [IntroductionSteps.watchOverviewVideo]: true, step2: true });
    });
  });

  it('should return all finished steps from storage', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      const allFinishedSteps = result.current.getAllFinishedStepsFromStorage();
      expect(allFinishedSteps).toEqual({});
    });

    act(() => {
      mockStorage.set('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
        card2: { step3: true },
      });
      const allFinishedSteps = result.current.getAllFinishedStepsFromStorage();
      expect(allFinishedSteps).toEqual({
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
        card2: { step3: true },
      });
    });
  });

  it('should add a finished step to storage', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      result.current.addFinishedStepToStorage(
        GetSetUpCardId.introduction,
        IntroductionSteps.watchOverviewVideo
      );
      expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: { [IntroductionSteps.watchOverviewVideo]: true },
      });
    });

    act(() => {
      mockStorage.set('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: { [IntroductionSteps.watchOverviewVideo]: true },
      });
      result.current.addFinishedStepToStorage(GetSetUpCardId.introduction, 'step2' as StepId);
      expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
      });
    });
  });

  it('should get finished steps from storage by card ID', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      (mockStorage.get as jest.Mock).mockReturnValueOnce({
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
        card2: { step3: true },
      });
      const finishedSteps = result.current.getFinishedStepsFromStorageByCardId(
        GetSetUpCardId.introduction
      );
      expect(finishedSteps).toEqual({ [IntroductionSteps.watchOverviewVideo]: true, step2: true });
    });

    act(() => {
      (mockStorage.get as jest.Mock).mockReturnValueOnce({
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
        card2: { step3: true },
      });
      const finishedSteps = result.current.getFinishedStepsFromStorageByCardId('card2' as CardId);
      expect(finishedSteps).toEqual({ step3: true });
    });
  });

  it('should get all finished steps from storage', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      (mockStorage.get as jest.Mock).mockReturnValueOnce({
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
        card2: { step3: true },
        card3: { step4: true },
      });
      const allFinishedSteps = result.current.getAllFinishedStepsFromStorage();
      expect(allFinishedSteps).toEqual({
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
        card2: { step3: true },
        card3: { step4: true },
      });
    });

    act(() => {
      (mockStorage.get as jest.Mock).mockReturnValueOnce({});
      const allFinishedSteps = result.current.getAllFinishedStepsFromStorage();
      expect(allFinishedSteps).toEqual({});
    });
  });

  it('should remove a finished step from storage', () => {
    const { result } = renderHook(() => useStorage(mockStorage));

    act(() => {
      (mockStorage.get as jest.Mock).mockReturnValueOnce({
        [GetSetUpCardId.introduction]: {
          [IntroductionSteps.watchOverviewVideo]: true,
          step2: true,
        },
      });
      result.current.removeFinishedStep(
        GetSetUpCardId.introduction,
        IntroductionSteps.watchOverviewVideo
      );
      expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: { step2: true },
      });
    });

    act(() => {
      (mockStorage.get as jest.Mock).mockReturnValueOnce({
        [GetSetUpCardId.introduction]: { step2: true },
      });
      result.current.removeFinishedStep(GetSetUpCardId.introduction, 'step2' as StepId);
      expect(mockStorage.set).toHaveBeenCalledWith('FINISHED_STEPS', {
        [GetSetUpCardId.introduction]: {},
      });
    });
  });
});
