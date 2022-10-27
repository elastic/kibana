/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { of } from 'rxjs';
import { TourContextProvider, useTourContext } from './tour';
import { SecurityStepId, securityTourConfig } from './tour_config';
import { useKibana } from '../../lib/kibana';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: () => true,
}));

jest.mock('react-router-dom', () => {
  const original = jest.requireActual('react-router-dom');

  return {
    ...original,
    useLocation: jest.fn().mockReturnValue({ pathname: '/alerts' }),
  };
});

describe('useTourContext', () => {
  const mockCompleteGuideStep = jest.fn();
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        guidedOnboarding: {
          guidedOnboardingApi: {
            isGuideStepActive$: () => of(true),
            completeGuideStep: mockCompleteGuideStep,
          },
        },
      },
    });
    jest.clearAllMocks();
  });
  // @ts-ignore
  const stepIds = Object.values(SecurityStepId);
  describe.each(stepIds)('%s', (stepId) => {
    it('if guidedOnboardingApi?.isGuideStepActive$ is false, isTourShown should be false', () => {
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          guidedOnboarding: {
            guidedOnboardingApi: {
              isGuideStepActive$: () => of(false),
            },
          },
        },
      });
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      expect(result.current.isTourShown(stepId)).toBe(false);
    });
    it('if guidedOnboardingApi?.isGuideStepActive$ is true, isTourShown should be true', () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      expect(result.current.isTourShown(stepId)).toBe(true);
    });
    it('endTourStep calls completeGuideStep with correct stepId', () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      result.current.endTourStep(stepId);
      expect(mockCompleteGuideStep).toHaveBeenCalledWith('security', stepId);
    });
    it('activeStep is initially 1', () => {
      const { result } = renderHook(() => useTourContext(), {
        wrapper: TourContextProvider,
      });
      expect(result.current.activeStep).toBe(1);
    });
    it('increment step properly increments for each stepId, and if attempted to increment beyond length of tour config steps resets activeStep to 1', async () => {
      await act(async () => {
        const { result, waitForNextUpdate } = renderHook(() => useTourContext(), {
          wrapper: TourContextProvider,
        });
        await waitForNextUpdate();
        const stepCount = securityTourConfig[stepId].length;
        for (let i = 0; i < stepCount - 1; i++) {
          result.current.incrementStep(stepId);
        }
        const lastStep = stepCount ? stepCount : 1;
        expect(result.current.activeStep).toBe(lastStep);
        result.current.incrementStep(stepId);
        expect(result.current.activeStep).toBe(1);
      });
    });
  });
});
