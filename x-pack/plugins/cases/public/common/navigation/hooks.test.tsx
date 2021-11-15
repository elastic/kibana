/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook } from '@testing-library/react-hooks';

import { useNavigation } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import {
  useCasesNavigation,
  useAllCasesNavigation,
  useCreateCaseNavigation,
  useConfigureCasesNavigation,
  useCaseViewNavigation,
} from './hooks';
import { CasesDeepLinkId } from './deep_links';

const useNavigationMock = useNavigation as jest.Mock;
jest.mock('../../common/lib/kibana');

const navigateTo = jest.fn();
const getAppUrl = jest.fn();

describe('hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigationMock.mockReturnValue({ navigateTo, getAppUrl });
  });

  describe('useCasesNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useCasesNavigation(CasesDeepLinkId.cases), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      const [getCasesUrl] = result.current;

      act(() => {
        getCasesUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, deepLinkId: 'cases' });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useCasesNavigation(CasesDeepLinkId.cases), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });
      const [_, navigateToCases] = result.current;

      act(() => {
        navigateToCases();
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: 'cases' });
    });
  });

  describe('useAllCasesNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useAllCasesNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.getAllCasesUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, deepLinkId: 'cases' });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useAllCasesNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.navigateToAllCases();
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: 'cases' });
    });
  });

  describe('useCreateCaseNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useCreateCaseNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.getCreateCaseUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, deepLinkId: 'cases_create' });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useCreateCaseNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.navigateToCreateCase();
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: 'cases_create' });
    });
  });

  describe('useConfigureCasesNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useConfigureCasesNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.getConfigureCasesUrl(false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({ absolute: false, deepLinkId: 'cases_configure' });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useConfigureCasesNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.navigateToConfigureCases();
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: 'cases_configure' });
    });
  });

  describe('useCaseViewNavigation', () => {
    it('it calls getAppUrl with correct arguments', () => {
      const { result } = renderHook(() => useCaseViewNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.getCaseViewUrl({ detailName: 'test' }, false);
      });

      expect(getAppUrl).toHaveBeenCalledWith({
        absolute: false,
        deepLinkId: 'cases',
        path: '/test',
      });
    });

    it('it calls navigateToAllCases with correct arguments', () => {
      const { result } = renderHook(() => useCaseViewNavigation(), {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      });

      act(() => {
        result.current.navigateToCaseView({ detailName: 'test' });
      });

      expect(navigateTo).toHaveBeenCalledWith({ deepLinkId: 'cases', path: '/test' });
    });
  });
});
