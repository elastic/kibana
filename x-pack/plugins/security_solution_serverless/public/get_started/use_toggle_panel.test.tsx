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
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
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

    expect(state.activeCards).toEqual(
      expect.objectContaining({
        [SectionId.getSetUp]: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            timeInMins: 3,
            stepsLeft: 1,
          },
          [GetSetUpCardId.activateAndCreateRules]: {
            id: GetSetUpCardId.activateAndCreateRules,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetSetUpCardId.bringInYourData]: {
            id: GetSetUpCardId.bringInYourData,
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
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
            id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetMoreFromElasticSecurityCardId.respondToThreats]: {
            id: GetMoreFromElasticSecurityCardId.respondToThreats,
            timeInMins: 0,
            stepsLeft: 0,
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
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
    });

    expect(state.activeCards).toEqual(
      expect.objectContaining({
        [SectionId.getSetUp]: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetSetUpCardId.activateAndCreateRules]: {
            id: GetSetUpCardId.activateAndCreateRules,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetSetUpCardId.bringInYourData]: {
            id: GetSetUpCardId.bringInYourData,
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
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
            id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetMoreFromElasticSecurityCardId.respondToThreats]: {
            id: GetMoreFromElasticSecurityCardId.respondToThreats,
            timeInMins: 0,
            stepsLeft: 0,
          },
        },
      })
    );
  });

  test('should initialize state with correct initial values - when only security product active', () => {
    (getStartedStorage.getActiveProductsFromStorage as jest.Mock).mockReturnValue([
      ProductLine.security,
    ]);
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(new Set([ProductLine.security]));
    expect(state.finishedSteps).toEqual({
      [GetSetUpCardId.introduction]: new Set([IntroductionSteps.watchOverviewVideo]),
    });

    expect(state.activeCards).toEqual(
      expect.objectContaining({
        [SectionId.getSetUp]: {
          [GetSetUpCardId.introduction]: {
            id: GetSetUpCardId.introduction,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetSetUpCardId.activateAndCreateRules]: {
            id: GetSetUpCardId.activateAndCreateRules,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetSetUpCardId.bringInYourData]: {
            id: GetSetUpCardId.bringInYourData,
            timeInMins: 0,
            stepsLeft: 0,
          },
        },
        [SectionId.getMoreFromElasticSecurity]: {
          [GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow]: {
            id: GetMoreFromElasticSecurityCardId.masterTheInvestigationsWorkflow,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace]: {
            id: GetMoreFromElasticSecurityCardId.optimizeYourWorkSpace,
            timeInMins: 0,
            stepsLeft: 0,
          },
          [GetMoreFromElasticSecurityCardId.respondToThreats]: {
            id: GetMoreFromElasticSecurityCardId.respondToThreats,
            timeInMins: 0,
            stepsLeft: 0,
          },
        },
      })
    );
  });

  test('should call addFinishedStepToStorage', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes }));

    const { onStepClicked } = result.current;

    act(() => {
      onStepClicked({
        stepId: IntroductionSteps.watchOverviewVideo,
        cardId: GetSetUpCardId.introduction,
        sectionId: SectionId.getSetUp,
      });
    });

    expect(getStartedStorage.addFinishedStepToStorage).toHaveBeenCalledTimes(1);
    expect(getStartedStorage.addFinishedStepToStorage).toHaveBeenCalledWith(
      GetSetUpCardId.introduction,
      IntroductionSteps.watchOverviewVideo
    );
  });

  test('should call toggleActiveProductsInStorage', () => {
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
