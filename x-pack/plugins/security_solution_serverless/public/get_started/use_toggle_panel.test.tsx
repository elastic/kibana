/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useTogglePanel } from './use_toggle_panel';
import { getStartedStorage } from './storage';
import { ProductLine } from '../../common/product';
import type { SecurityProductTypes } from '../../common/config';
import {
  GetMoreFromElasticSecurityCardId,
  GetSetUpCardId,
  IntroductionSteps,
  SectionId,
} from './types';

jest.mock('./storage');

describe('useTogglePanel', () => {
  const productTypes = [
    { product_line: 'security', product_tier: 'essentials' },
    { product_line: 'endpoint', product_tier: 'complete' },
  ] as SecurityProductTypes;

  beforeEach(() => {
    jest.clearAllMocks();

    (getStartedStorage.getAllFinishedStepsFromStorage as jest.Mock).mockReturnValue({
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    });
    (getStartedStorage.getActiveProductsFromStorage as jest.Mock).mockReturnValue([
      ProductLine.security,
      ProductLine.cloud,
      ProductLine.endpoint,
    ]);
  });

  test('should initialize state with correct initial values - when no active products from local storage', () => {
    (getStartedStorage.getAllFinishedStepsFromStorage as jest.Mock).mockReturnValue({});
    (getStartedStorage.getActiveProductsFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(new Set([ProductLine.security, ProductLine.endpoint]));
    expect(state.finishedSteps).toEqual({});

    expect(state.activeSections).toEqual(
      expect.objectContaining({
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
        [SectionId.getMoreFromElasticSecurity]: {
          [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
            id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
            timeInMins: 0,
            stepsLeft: 5,
          },
          [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
            id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
            timeInMins: 0,
            stepsLeft: 5,
          },
          [GetMoreFromElasticSecurityCardId.respondToThreats]: {
            id: GetMoreFromElasticSecurityCardId.respondToThreats,
            timeInMins: 0,
            stepsLeft: 2,
          },
        },
      })
    );
  });

  test('should initialize state with correct initial values - when all products active', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(
      new Set([ProductLine.security, ProductLine.cloud, ProductLine.endpoint])
    );
    expect(state.finishedSteps).toEqual({
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    });

    expect(state.activeSections).toEqual(
      expect.objectContaining({
        [SectionId.getSetUp]: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            timeInMins: 0,
            stepsLeft: 0,
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
        [SectionId.getMoreFromElasticSecurity]: {
          [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
            id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
            timeInMins: 0,
            stepsLeft: 5,
          },
          [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
            id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
            timeInMins: 0,
            stepsLeft: 5,
          },
          [GetMoreFromElasticSecurityCardId.respondToThreats]: {
            id: GetMoreFromElasticSecurityCardId.respondToThreats,
            timeInMins: 0,
            stepsLeft: 2,
          },
        },
      })
    );
  });

  test('should initialize state with correct initial values - when security product active', () => {
    (getStartedStorage.getActiveProductsFromStorage as jest.Mock).mockReturnValue([
      ProductLine.security,
    ]);
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(new Set([ProductLine.security]));
    expect(state.finishedSteps).toEqual({
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.getToKnowElasticSecurity]),
    });

    expect(state.activeSections).toEqual(
      expect.objectContaining({
        [SectionId.getSetUp]: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            timeInMins: 0,
            stepsLeft: 0,
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
        [SectionId.getMoreFromElasticSecurity]: {
          [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
            id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
            timeInMins: 0,
            stepsLeft: 5,
          },
          [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
            id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
            timeInMins: 0,
            stepsLeft: 5,
          },
          [GetMoreFromElasticSecurityCardId.respondToThreats]: {
            id: GetMoreFromElasticSecurityCardId.respondToThreats,
            timeInMins: 0,
            stepsLeft: 2,
          },
        },
      })
    );
  });

  test('should call addFinishedStepToStorage when onStepClicked is executed', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { onStepClicked } = result.current;

    act(() => {
      onStepClicked({
        stepId: IntroductionSteps.getToKnowElasticSecurity,
        cardId: GetSetUpCardId.introduction,
        sectionId: SectionId.getSetUp,
      });
    });

    expect(getStartedStorage.addFinishedStepToStorage).toHaveBeenCalledTimes(1);
    expect(getStartedStorage.addFinishedStepToStorage).toHaveBeenCalledWith(
      GetSetUpCardId.introduction,
      IntroductionSteps.getToKnowElasticSecurity
    );
  });

  test('should call addFinishedStepToStorage when onStepButtonClicked is executed', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { onStepButtonClicked } = result.current;

    act(() => {
      onStepButtonClicked({
        stepId: IntroductionSteps.getToKnowElasticSecurity,
        cardId: GetSetUpCardId.introduction,
        sectionId: SectionId.getSetUp,
      });
    });

    expect(getStartedStorage.addFinishedStepToStorage).toHaveBeenCalledTimes(1);
    expect(getStartedStorage.addFinishedStepToStorage).toHaveBeenCalledWith(
      GetSetUpCardId.introduction,
      IntroductionSteps.getToKnowElasticSecurity
    );
  });

  test('should call removeFinishedStepToStorage when onStepButtonClicked is executed with undo equals to true', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { onStepButtonClicked } = result.current;

    act(() => {
      onStepButtonClicked({
        stepId: IntroductionSteps.getToKnowElasticSecurity,
        cardId: GetSetUpCardId.introduction,
        sectionId: SectionId.getSetUp,
        undo: true,
      });
    });

    expect(getStartedStorage.removeFinishedStepFromStorage).toHaveBeenCalledTimes(1);
    expect(getStartedStorage.removeFinishedStepFromStorage).toHaveBeenCalledWith(
      GetSetUpCardId.introduction,
      IntroductionSteps.getToKnowElasticSecurity
    );
  });

  test('should call toggleActiveProductsInStorage when onProductSwitchChanged is executed', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { onProductSwitchChanged } = result.current;

    act(() => {
      onProductSwitchChanged({ id: ProductLine.security, label: 'Analytics' });
    });

    expect(getStartedStorage.toggleActiveProductsInStorage).toHaveBeenCalledTimes(1);
    expect(getStartedStorage.toggleActiveProductsInStorage).toHaveBeenCalledWith(
      ProductLine.security
    );
  });
});
