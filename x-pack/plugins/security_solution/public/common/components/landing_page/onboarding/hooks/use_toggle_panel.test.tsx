/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook, act } from '@testing-library/react-hooks';
import { useTogglePanel } from './use_toggle_panel';

import type { StepId } from '../types';
import {
  QuickStartSectionCardsId,
  SectionId,
  CreateProjectSteps,
  OverviewSteps,
  AddAndValidateYourDataCardsId,
  AddIntegrationsSteps,
  ViewDashboardSteps,
  GetStartedWithAlertsCardsId,
  ViewAlertsSteps,
  EnablePrebuiltRulesSteps,
} from '../types';
import type { SecurityProductTypes } from '../configs';
import { ProductLine } from '../configs';
import { OnboardingStorage } from '../storage';
import * as mockStorage from '../__mocks__/storage';

jest.mock('../storage', () => ({
  OnboardingStorage: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({ hash: '' }),
}));

jest.mock('@kbn/security-solution-navigation', () => ({
  useNavigateTo: jest.fn().mockReturnValue({ navigateTo: jest.fn() }),
  SecurityPageName: {
    landing: 'landing',
  },
}));

jest.mock('../../../../lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      telemetry: {
        reportOnboardingHubStepOpen: jest.fn(),
        reportOnboardingHubStepFinished: jest.fn(),
      },
    },
  }),
}));

describe('useTogglePanel', () => {
  const productTypes = [
    { product_line: 'security', product_tier: 'essentials' },
    { product_line: 'endpoint', product_tier: 'complete' },
  ] as SecurityProductTypes;

  const onboardingSteps: StepId[] = [
    CreateProjectSteps.createFirstProject,
    AddIntegrationsSteps.connectToDataSources,
    ViewDashboardSteps.analyzeData,
    EnablePrebuiltRulesSteps.enablePrebuiltRules,
    ViewAlertsSteps.viewAlerts,
  ];

  const spaceId = 'testSpaceId';

  beforeEach(() => {
    jest.clearAllMocks();

    (OnboardingStorage as jest.Mock).mockImplementation(() => ({
      getAllFinishedStepsFromStorage: mockStorage.mockGetAllFinishedStepsFromStorage,
      getFinishedStepsFromStorageByCardId: mockStorage.mockGetFinishedStepsFromStorageByCardId,
      getActiveProductsFromStorage: mockStorage.mockGetActiveProductsFromStorage,
      toggleActiveProductsInStorage: mockStorage.mockToggleActiveProductsInStorage,
      resetAllExpandedCardStepsToStorage: mockStorage.mockResetAllExpandedCardStepsToStorage,
      addFinishedStepToStorage: mockStorage.mockAddFinishedStepToStorage,
      removeFinishedStepFromStorage: mockStorage.mockRemoveFinishedStepFromStorage,
      addExpandedCardStepToStorage: mockStorage.mockAddExpandedCardStepToStorage,
      removeExpandedCardStepFromStorage: mockStorage.mockRemoveExpandedCardStepFromStorage,
      getAllExpandedCardStepsFromStorage: mockStorage.mockGetAllExpandedCardStepsFromStorage,
    }));

    (mockStorage.mockGetAllFinishedStepsFromStorage as jest.Mock).mockReturnValue({
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    });
    (mockStorage.mockGetActiveProductsFromStorage as jest.Mock).mockReturnValue([
      ProductLine.security,
      ProductLine.cloud,
      ProductLine.endpoint,
    ]);
  });

  test('should initialize state with correct initial values - when no active products from local storage', () => {
    (mockStorage.mockGetActiveProductsFromStorage as jest.Mock).mockReturnValue([]);

    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(new Set([ProductLine.security, ProductLine.endpoint]));
    expect(state.finishedSteps).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    });

    expect(state.activeSections).toEqual(
      expect.objectContaining({
        [SectionId.quickStart]: {
          [QuickStartSectionCardsId.createFirstProject]: {
            id: QuickStartSectionCardsId.createFirstProject,
            timeInMins: 0,
            stepsLeft: 0,
            activeStepIds: [CreateProjectSteps.createFirstProject],
          },
        },
        [SectionId.addAndValidateYourData]: {
          [AddAndValidateYourDataCardsId.addIntegrations]: {
            id: AddAndValidateYourDataCardsId.addIntegrations,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [AddIntegrationsSteps.connectToDataSources],
          },
          [AddAndValidateYourDataCardsId.viewDashboards]: {
            id: AddAndValidateYourDataCardsId.viewDashboards,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [ViewDashboardSteps.analyzeData],
          },
        },
        [SectionId.getStartedWithAlerts]: {
          [GetStartedWithAlertsCardsId.enablePrebuiltRules]: {
            id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [EnablePrebuiltRulesSteps.enablePrebuiltRules],
          },
          [GetStartedWithAlertsCardsId.viewAlerts]: {
            id: GetStartedWithAlertsCardsId.viewAlerts,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [ViewAlertsSteps.viewAlerts],
          },
        },
      })
    );
  });

  test('should initialize state with correct initial values - when all products active', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(
      new Set([ProductLine.security, ProductLine.cloud, ProductLine.endpoint])
    );
    expect(state.finishedSteps).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    });

    expect(state.activeSections).toEqual(
      expect.objectContaining({
        [SectionId.quickStart]: {
          [QuickStartSectionCardsId.createFirstProject]: {
            id: QuickStartSectionCardsId.createFirstProject,
            timeInMins: 0,
            stepsLeft: 0,
            activeStepIds: [CreateProjectSteps.createFirstProject],
          },
        },
        [SectionId.addAndValidateYourData]: {
          [AddAndValidateYourDataCardsId.addIntegrations]: {
            id: AddAndValidateYourDataCardsId.addIntegrations,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [AddIntegrationsSteps.connectToDataSources],
          },
          [AddAndValidateYourDataCardsId.viewDashboards]: {
            id: AddAndValidateYourDataCardsId.viewDashboards,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [ViewDashboardSteps.analyzeData],
          },
        },
        [SectionId.getStartedWithAlerts]: {
          [GetStartedWithAlertsCardsId.enablePrebuiltRules]: {
            id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [EnablePrebuiltRulesSteps.enablePrebuiltRules],
          },
          [GetStartedWithAlertsCardsId.viewAlerts]: {
            id: GetStartedWithAlertsCardsId.viewAlerts,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [ViewAlertsSteps.viewAlerts],
          },
        },
      })
    );
  });

  test('should initialize state with correct initial values - when security product active', () => {
    (mockStorage.mockGetActiveProductsFromStorage as jest.Mock).mockReturnValue([
      ProductLine.security,
    ]);
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { state } = result.current;

    expect(state.activeProducts).toEqual(new Set([ProductLine.security]));
    expect(state.finishedSteps).toEqual({
      [QuickStartSectionCardsId.createFirstProject]: new Set([
        CreateProjectSteps.createFirstProject,
      ]),
    });

    expect(state.activeSections).toEqual(
      expect.objectContaining({
        [SectionId.quickStart]: {
          [QuickStartSectionCardsId.createFirstProject]: {
            id: QuickStartSectionCardsId.createFirstProject,
            timeInMins: 0,
            stepsLeft: 0,
            activeStepIds: [CreateProjectSteps.createFirstProject],
          },
        },
        [SectionId.addAndValidateYourData]: {
          [AddAndValidateYourDataCardsId.addIntegrations]: {
            id: AddAndValidateYourDataCardsId.addIntegrations,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [AddIntegrationsSteps.connectToDataSources],
          },
          [AddAndValidateYourDataCardsId.viewDashboards]: {
            id: AddAndValidateYourDataCardsId.viewDashboards,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [ViewDashboardSteps.analyzeData],
          },
        },
        [SectionId.getStartedWithAlerts]: {
          [GetStartedWithAlertsCardsId.enablePrebuiltRules]: {
            id: EnablePrebuiltRulesSteps.enablePrebuiltRules,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [EnablePrebuiltRulesSteps.enablePrebuiltRules],
          },
          [GetStartedWithAlertsCardsId.viewAlerts]: {
            id: GetStartedWithAlertsCardsId.viewAlerts,
            timeInMins: 0,
            stepsLeft: 1,
            activeStepIds: [ViewAlertsSteps.viewAlerts],
          },
        },
      })
    );
  });

  test('should reset all the card steps in storage when a step is expanded. (As it allows only one step open at a time)', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { onStepClicked } = result.current;

    act(() => {
      onStepClicked({
        stepId: OverviewSteps.getToKnowElasticSecurity,
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        isExpanded: true,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockResetAllExpandedCardStepsToStorage).toHaveBeenCalledTimes(1);
  });

  test('should add the current step to storage when it is expanded', () => {
    const { result } = renderHook(() =>
      useTogglePanel({ productTypes, onboardingSteps, spaceId: 'testSpaceId' })
    );

    const { onStepClicked } = result.current;

    act(() => {
      onStepClicked({
        stepId: OverviewSteps.getToKnowElasticSecurity,
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        isExpanded: true,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockAddExpandedCardStepToStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockAddExpandedCardStepToStorage).toHaveBeenCalledWith(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
  });

  test('should remove the current step from storage when it is collapsed', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { onStepClicked } = result.current;

    act(() => {
      onStepClicked({
        stepId: OverviewSteps.getToKnowElasticSecurity,
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        isExpanded: false,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockRemoveExpandedCardStepFromStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockRemoveExpandedCardStepFromStorage).toHaveBeenCalledWith(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
  });

  test('should call addFinishedStepToStorage when toggleTaskCompleteStatus is executed', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { toggleTaskCompleteStatus } = result.current;

    act(() => {
      toggleTaskCompleteStatus({
        stepId: OverviewSteps.getToKnowElasticSecurity,
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockAddFinishedStepToStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockAddFinishedStepToStorage).toHaveBeenCalledWith(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity
    );
  });

  test('should call removeFinishedStepToStorage when toggleTaskCompleteStatus is executed with undo equals to true', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { toggleTaskCompleteStatus } = result.current;

    act(() => {
      toggleTaskCompleteStatus({
        stepId: OverviewSteps.getToKnowElasticSecurity,
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        undo: true,
        trigger: 'click',
      });
    });

    expect(mockStorage.mockRemoveFinishedStepFromStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockRemoveFinishedStepFromStorage).toHaveBeenCalledWith(
      QuickStartSectionCardsId.watchTheOverviewVideo,
      OverviewSteps.getToKnowElasticSecurity,
      onboardingSteps
    );
  });

  test('should call toggleActiveProductsInStorage when onProductSwitchChanged is executed', () => {
    const { result } = renderHook(() => useTogglePanel({ productTypes, onboardingSteps, spaceId }));

    const { onProductSwitchChanged } = result.current;

    act(() => {
      onProductSwitchChanged({ id: ProductLine.security, label: 'Analytics' });
    });

    expect(mockStorage.mockToggleActiveProductsInStorage).toHaveBeenCalledTimes(1);
    expect(mockStorage.mockToggleActiveProductsInStorage).toHaveBeenCalledWith(
      ProductLine.security
    );
  });
});
