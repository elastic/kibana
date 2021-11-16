/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../common/mock';
import { useCasesBreadcrumbs, useCasesTitleBreadcrumbs } from '.';
import { CasesDeepLinkId } from '../../common/navigation';
import { ChromeBreadcrumb } from '../../../../../../src/core/public';

const mockSetBreadcrumbs = jest.fn();
const mockSetTitle = jest.fn();

jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useNavigation: jest.fn().mockReturnValue({
      getAppUrl: jest.fn(({ deepLinkId }: { deepLinkId: string }) => deepLinkId),
    }),
    useKibana: () => {
      return {
        services: {
          chrome: { setBreadcrumbs: mockSetBreadcrumbs, docTitle: { change: mockSetTitle } },
          application: { navigateToUrl: jest.fn() },
        },
      };
    },
  };
});

const getWrapper =
  (rootBreadcrumbs?: ChromeBreadcrumb[]) =>
  // eslint-disable-next-line react/display-name
  ({ children }: { children?: ReactNode }) =>
    <TestProviders rootBreadcrumbs={rootBreadcrumbs}>{children}</TestProviders>;

describe('useCasesBreadcrumbs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('with empty rootBreadcrumbs', () => {
    it('sets the cases breadcrumb text only', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper: getWrapper([]) });

      expect(mockSetBreadcrumbs).toHaveBeenCalledWith([{ text: 'Cases' }]);
    });

    it('sets the cases title', () => {
      renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper: getWrapper([]) });
      expect(mockSetTitle).toHaveBeenCalledWith(['Cases']);
    });
  });

  describe('with rootBreadcrumbs', () => {
    const wrapper = getWrapper([{ text: 'Root', href: '/root' }]);

    describe('set all_cases breadcrumbs', () => {
      it('call setBreadcrumbs with all items', () => {
        renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper });
        expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
          { href: '/root', onClick: expect.any(Function), text: 'Root' },
          { text: 'Cases' },
        ]);
      });

      it('should sets the cases title', () => {
        renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.cases), { wrapper });
        expect(mockSetTitle).toHaveBeenCalledWith(['Cases', 'Root']);
      });
    });

    describe('set create_case breadcrumbs', () => {
      it('call setBreadcrumbs with all items', () => {
        renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesCreate), { wrapper });
        expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
          { href: '/root', onClick: expect.any(Function), text: 'Root' },
          { href: CasesDeepLinkId.cases, onClick: expect.any(Function), text: 'Cases' },
          { text: 'Create' },
        ]);
      });

      it('should sets the cases title', () => {
        renderHook(() => useCasesBreadcrumbs(CasesDeepLinkId.casesCreate), { wrapper });
        expect(mockSetTitle).toHaveBeenCalledWith(['Create', 'Cases', 'Root']);
      });
    });

    describe('set case_view breadcrumbs', () => {
      const title = 'Fake Title';
      it('call setBreadcrumbs with title', () => {
        renderHook(() => useCasesTitleBreadcrumbs(title), { wrapper });
        expect(mockSetBreadcrumbs).toHaveBeenCalledWith([
          { href: '/root', onClick: expect.any(Function), text: 'Root' },
          { href: CasesDeepLinkId.cases, onClick: expect.any(Function), text: 'Cases' },
          { text: title },
        ]);
      });

      it('should sets the cases title', () => {
        renderHook(() => useCasesTitleBreadcrumbs(title), { wrapper });
        expect(mockSetTitle).toHaveBeenCalledWith([title, 'Cases', 'Root']);
      });
    });
  });
});
