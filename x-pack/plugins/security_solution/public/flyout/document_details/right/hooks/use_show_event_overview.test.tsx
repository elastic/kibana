/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useShowEventOverview } from './use_show_event_overview';
import { renderHook } from '@testing-library/react-hooks';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

const getFieldsData = jest.fn();

describe('showEventOverview', () => {
  describe('event renderer is not available', () => {
    const dataAsNestedObject = {} as unknown as Ecs;

    describe('event.kind is not event', () => {
      it('should return true if event.kind is in ecs allowed values', () => {
        getFieldsData.mockImplementation((field: string) => {
          if (field === 'event.kind') {
            return 'alert';
          }
        });
        const hookResult = renderHook(() =>
          useShowEventOverview({ getFieldsData, dataAsNestedObject }).valueOf()
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
          useShowEventOverview({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(false);
      });

      it('should return false if event.kind is notavailable', () => {
        getFieldsData.mockImplementation(() => {});
        const hookResult = renderHook(() =>
          useShowEventOverview({ getFieldsData, dataAsNestedObject })
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
          useShowEventOverview({ getFieldsData, dataAsNestedObject })
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
          useShowEventOverview({ getFieldsData, dataAsNestedObject })
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
          useShowEventOverview({ getFieldsData, dataAsNestedObject })
        );
        expect(hookResult.result.current).toBe(false);
      });
    });
  });

  describe('event renderer is available', () => {
    const dataAsNestedObject = { event: { module: ['suricata'] } } as unknown as Ecs;
    it('should return true', () => {
      const hookResult = renderHook(() =>
        useShowEventOverview({ getFieldsData, dataAsNestedObject })
      );
      expect(hookResult.result.current).toBe(true);
    });
  });
});
