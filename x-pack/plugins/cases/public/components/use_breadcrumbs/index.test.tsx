/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { useCasesBreadcrumbs, useCasesTitleBreadcrumbs } from '.';
import { CasesDeepLinkId } from '../../common/navigation';

const mockSetBreadcrumbs = jest.fn();
const mockSetTitle = jest.fn();
const mockSetServerlessBreadcrumbs = jest.fn();
const mockGetKibanaServices = jest.fn((): unknown => ({
  serverless: { setBreadcrumbs: mockSetServerlessBreadcrumbs },
}));

jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    KibanaServices: {
      ...originalModule.KibanaServices,
      get: () => mockGetKibanaServices(),
    },
    useNavigation: jest.fn().mockReturnValue({
      getAppUrl: jest.fn((params?: { deepLinkId: string }) => params?.deepLinkId ?? '/test'),
    }),
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          chrome: { setBreadcrumbs: mockSetBreadcrumbs, docTitle: { change: mockSetTitle } },
        },
      };
    },
  };
});

const wrapper = ({ children }: { children?: ReactNode }) => (
  <TestProviders>{children}</TestProviders>
);

describe('useCasesBreadcrumbs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('set all_cases breadcrumbs', () => {
    it('call setBreadcrumbs with all items', async () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper });
      expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
        [{ href: '/test', onClick: expect.any(Function), text: 'Test' }, { text: 'Cases' }],
        { project: { value: [] } }
      );
      expect(mockSetServerlessBreadcrumbs).toHaveBeenCalledWith([]);
    });

    it('should sets the cases title', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper });
      expect(mockSetTitle).toHaveBeenCalledWith(['Cases', 'Test']);
    });

    it('should not set serverless breadcrumbs in ess', () => {
      mockGetKibanaServices.mockReturnValueOnce({ serverless: undefined });
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper });
      expect(mockSetServerlessBreadcrumbs).not.toHaveBeenCalled();
    });
  });

  describe('set create_case breadcrumbs', () => {
    it('call setBreadcrumbs with all items', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesCreate), { wrapper });
      expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
        [
          { href: '/test', onClick: expect.any(Function), text: 'Test' },
          { href: CasesDeepLinkId.cases, onClick: expect.any(Function), text: 'Cases' },
          { text: 'Create' },
        ],
        { project: { value: [] } }
      );
      expect(mockSetServerlessBreadcrumbs).toHaveBeenCalledWith([]);
    });

    it('should sets the cases title', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesCreate), { wrapper });
      expect(mockSetTitle).toHaveBeenCalledWith(['Create', 'Cases', 'Test']);
    });

    it('should not set serverless breadcrumbs in ess', () => {
      mockGetKibanaServices.mockReturnValueOnce({ serverless: undefined });
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesCreate), { wrapper });
      expect(mockSetServerlessBreadcrumbs).not.toHaveBeenCalled();
    });
  });

  describe('set case_view breadcrumbs', () => {
    const title = 'Fake Title';
    it('call setBreadcrumbs with title', () => {
      renderHook(() => useCasesTitleBreadcrumbs(title), { wrapper });
      expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
        [
          { href: '/test', onClick: expect.any(Function), text: 'Test' },
          { href: CasesDeepLinkId.cases, onClick: expect.any(Function), text: 'Cases' },
          { text: title },
        ],
        { project: { value: [{ text: title }] } }
      );
      expect(mockSetServerlessBreadcrumbs).toHaveBeenCalledWith([{ text: title }]);
    });

    it('should sets the cases title', () => {
      renderHook(() => useCasesTitleBreadcrumbs(title), { wrapper });
      expect(mockSetTitle).toHaveBeenCalledWith([title, 'Cases', 'Test']);
    });

    it('should not set serverless breadcrumbs in ess', () => {
      mockGetKibanaServices.mockReturnValueOnce({ serverless: undefined });
      renderHook(() => useCasesTitleBreadcrumbs(title), { wrapper });
      expect(mockSetServerlessBreadcrumbs).not.toHaveBeenCalled();
    });
  });

  describe('set settings breadcrumbs', () => {
    it('call setBreadcrumbs with all items', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure), { wrapper });
      expect(mockSetBreadcrumbs).toHaveBeenCalledWith(
        [
          { href: '/test', onClick: expect.any(Function), text: 'Test' },
          { href: CasesDeepLinkId.cases, onClick: expect.any(Function), text: 'Cases' },
          { text: 'Settings' },
        ],
        { project: { value: [] } }
      );
      expect(mockSetServerlessBreadcrumbs).toHaveBeenCalledWith([]);
    });

    it('should set the cases title', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure), { wrapper });
      expect(mockSetTitle).toHaveBeenCalledWith(['Settings', 'Cases', 'Test']);
    });

    it('should not set serverless breadcrumbs in ess', () => {
      mockGetKibanaServices.mockReturnValueOnce({ serverless: undefined });
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesConfigure), { wrapper });
      expect(mockSetServerlessBreadcrumbs).not.toHaveBeenCalled();
    });
  });
});
