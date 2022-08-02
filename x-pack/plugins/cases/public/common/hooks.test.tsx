/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';

import { TestProviders } from './mock';
import { useIsMainApplication } from './hooks';
import { useApplication } from '../components/cases_context/use_application';

jest.mock('../components/cases_context/use_application');

const useApplicationMock = useApplication as jest.Mock;

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useApplicationMock.mockReturnValue({ appId: 'management', appTitle: 'Management' });
  });

  describe('useIsMainApplication', () => {
    it('returns true if it is the main application', () => {
      const { result } = renderHook(() => useIsMainApplication(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current).toBe(true);
    });

    it('returns false if it is not the main application', () => {
      useApplicationMock.mockReturnValue({ appId: 'testAppId', appTitle: 'Test app' });
      const { result } = renderHook(() => useIsMainApplication(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      expect(result.current).toBe(false);
    });
  });
});
