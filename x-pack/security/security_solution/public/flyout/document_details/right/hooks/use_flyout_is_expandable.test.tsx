/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFlyoutIsExpandable } from './use_flyout_is_expandable';
import { renderHook } from '@testing-library/react-hooks';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

const getFieldsData = jest.fn();
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(true),
}));
const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.Mock;

describe('useFlyoutIsExpandable', () => {
  it('always return ture when event.kind is signal (alert document)', () => {
    const dataAsNestedObject = {} as unknown as Ecs;
    getFieldsData.mockImplementation((field: string) => {
      if (field === 'event.kind') {
        return 'signal';
      }
    });
    const hookResult = renderHook(() =>
      useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject }).valueOf()
    );
    expect(hookResult.result.current).toBe(true);
  });

  it('always return false when event.kind is not signal and feature flag is off', () => {
    const dataAsNestedObject = {} as unknown as Ecs;
    useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
    getFieldsData.mockImplementation((field: string) => {
      if (field === 'event.kind') {
        return 'signal';
      }
    });
    const hookResult = renderHook(() =>
      useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject }).valueOf()
    );
    expect(hookResult.result.current).toBe(true);
  });

  describe('event renderer is not available', () => {
    beforeEach(() => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
    });
    const dataAsNestedObject = {} as unknown as Ecs;
    describe('event.kind is not event', () => {
      it('should return true if event.kind is in ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'alert';
          }
        });
        const hookResult = renderHook(() =>
          useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject }).valueOf()
        );
        expect(hookResult.result.current).toBe(true);
      });

      it('should return false if event.kind is not an ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'not ecs';
          }
        });
        const hookResult = renderHook(() =>
          useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(false);
      });

      it('should return false if event.kind is notavailable', () => {
        getFieldsData.mockImplementation(() => {});
        const hookResult = renderHook(() =>
          useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(false);
      });
    });

    describe('event.kind is event', () => {
      it('should return true if event.category is in ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'event';
          }
          if (field === 'event.category') {
            return 'file';
          }
        });
        const hookResult = renderHook(() =>
          useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(true);
      });

      it('should return false if event.category is not an ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'event';
          }
          if (field === 'event.category') {
            return 'not ecs';
          }
        });
        const hookResult = renderHook(() =>
          useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(false);
      });
      it('should return false if event.category is not available', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'event';
          }
        });
        const hookResult = renderHook(() =>
          useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(false);
      });
    });
  });

  describe('event renderer is available', () => {
    const dataAsNestedObject = { event: { module: ['suricata'] } } as unknown as Ecs;
    beforeEach(() => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
    });

    it('should return true', () => {
      const hookResult = renderHook(() =>
        useFlyoutIsExpandable({ getFieldsData, dataAsNestedObject })
      );
      expect(hookResult.result.current).toBe(true);
    });
  });
});
