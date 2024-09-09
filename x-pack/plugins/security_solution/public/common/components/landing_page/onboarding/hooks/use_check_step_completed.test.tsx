/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { renderHook } from '@testing-library/react-hooks';
import { useCheckStepCompleted } from './use_check_step_completed';
import {
  EnablePrebuiltRulesSteps,
  GetStartedWithAlertsCardsId,
  OverviewSteps,
  QuickStartSectionCardsId,
  SectionId,
} from '../types';

jest.mock('../../../../lib/kibana');

describe('useCheckStepCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('does nothing when autoCheckIfStepCompleted is not provided', () => {
    const { result } = renderHook(() =>
      useCheckStepCompleted({
        indicesExist: true,
        stepId: OverviewSteps.getToKnowElasticSecurity,
        cardId: QuickStartSectionCardsId.watchTheOverviewVideo,
        sectionId: SectionId.quickStart,
        toggleTaskCompleteStatus: jest.fn(),
      })
    );
    expect(result.current).toBeUndefined();
  });

  it('calls autoCheckIfStepCompleted and toggleTaskCompleteStatus', async () => {
    const mockAutoCheck = jest.fn().mockResolvedValue(true);
    const mockToggleTask = jest.fn();

    const { waitFor } = renderHook(() =>
      useCheckStepCompleted({
        autoCheckIfStepCompleted: mockAutoCheck,
        cardId: GetStartedWithAlertsCardsId.enablePrebuiltRules,
        indicesExist: true,
        sectionId: SectionId.getStartedWithAlerts,
        stepId: EnablePrebuiltRulesSteps.enablePrebuiltRules,
        toggleTaskCompleteStatus: mockToggleTask,
      })
    );

    await waitFor(() => {
      expect(mockAutoCheck).toHaveBeenCalled();
      expect(mockToggleTask).toHaveBeenCalledWith({
        sectionId: SectionId.getStartedWithAlerts,
        stepId: EnablePrebuiltRulesSteps.enablePrebuiltRules,
        cardId: GetStartedWithAlertsCardsId.enablePrebuiltRules,
        undo: false,
        trigger: 'auto_check',
      });
    });
  });

  it('does not toggleTaskCompleteStatus if authCheckIfStepCompleted was aborted', async () => {
    const mockAutoCheck = jest.fn(({ abortSignal }) => {
      abortSignal.abort();
      return Promise.resolve(false);
    });
    const mockToggleTask = jest.fn();

    const { waitFor } = renderHook(() =>
      useCheckStepCompleted({
        autoCheckIfStepCompleted: mockAutoCheck,
        cardId: GetStartedWithAlertsCardsId.enablePrebuiltRules,
        indicesExist: true,
        sectionId: SectionId.getStartedWithAlerts,
        stepId: EnablePrebuiltRulesSteps.enablePrebuiltRules,
        toggleTaskCompleteStatus: mockToggleTask,
      })
    );

    await waitFor(() => {
      expect(mockAutoCheck).toHaveBeenCalled();
      expect(mockToggleTask).not.toHaveBeenCalled();
    });
  });
});
