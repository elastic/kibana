/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { TestProviders } from '../../mock';
import type { RenderHookResult } from '@testing-library/react';
import { waitFor, act, cleanup, renderHook } from '@testing-library/react';
import type { GlobalFullScreen } from '.';
import { useGlobalFullScreen } from '.';

describe('useFullScreen', () => {
  describe('with no data-grid present in the dom', () => {
    let result: RenderHookResult<GlobalFullScreen, unknown>['result'];

    test('Default values with no data grid in the dom', async () => {
      const WrapperContainer = ({ children }: React.PropsWithChildren) => (
        <div className="euiDataGrid--fullScreen">
          <TestProviders>{children}</TestProviders>
        </div>
      );
      ({ result } = renderHook(() => useGlobalFullScreen(), {
        wrapper: WrapperContainer,
      }));
      await waitFor(() => expect(result.current.globalFullScreen).toEqual(false));

      act(() => {
        result.current.setGlobalFullScreen(true);
      });

      expect(result.current.globalFullScreen).toEqual(true);
      cleanup();
    });
  });

  describe('with a mock full screen data-grid in the dom', () => {
    let result: RenderHookResult<GlobalFullScreen, unknown>['result'];

    afterEach(() => {
      cleanup();
    });
    test('setting globalFullScreen to true should not remove the chrome removal class and data grid remains open and full screen', async () => {
      const WrapperContainer: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
        useEffect(() => {
          document.body.classList.add('euiDataGrid__restrictBody');
        }, []);
        return (
          <div className="euiDataGrid--fullScreen">
            <TestProviders>{children}</TestProviders>
          </div>
        );
      };

      ({ result } = renderHook(() => useGlobalFullScreen(), {
        wrapper: WrapperContainer,
      }));

      await waitFor(() => new Promise((resolve) => resolve(null)));
      act(() => {
        result.current.setGlobalFullScreen(true);
      });
      expect(document.querySelector('.euiDataGrid__restrictBody')).toBeTruthy();
    });
    test('setting globalFullScreen to false should remove the chrome removal class and data grid remains open and full screen', async () => {
      const WrapperContainer: React.FC<React.PropsWithChildren> = ({ children }) => {
        useEffect(() => {
          document.body.classList.add('euiDataGrid__restrictBody');
        }, []);
        return (
          <div className="euiDataGrid--fullScreen">
            <TestProviders>{children}</TestProviders>
          </div>
        );
      };
      ({ result } = renderHook(() => useGlobalFullScreen(), {
        wrapper: WrapperContainer,
      }));
      await waitFor(() => new Promise((resolve) => resolve(null)));
      act(() => {
        result.current.setGlobalFullScreen(false);
      });
      expect(document.querySelector('.euiDataGrid__restrictBody')).toBeNull();
    });
  });
});
