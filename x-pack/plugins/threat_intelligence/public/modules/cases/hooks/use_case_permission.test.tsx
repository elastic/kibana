/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode } from 'react';
import { Renderer, renderHook, RenderHookResult } from '@testing-library/react-hooks';
import { casesPluginMock } from '@kbn/cases-plugin/public/mocks';
import { KibanaContext } from '../../../hooks/use_kibana';
import { useCaseDisabled } from './use_case_permission';
import { TestProvidersComponent } from '../../../mocks/test_providers';
import { EMPTY_VALUE } from '../../../constants/common';

const casesServiceMock = casesPluginMock.createStartContract();

const getProviderComponent =
  (mockedServices: unknown) =>
  ({ children }: { children: ReactNode }) =>
    (
      <TestProvidersComponent>
        <KibanaContext.Provider value={{ services: mockedServices } as any}>
          {children}
        </KibanaContext.Provider>
      </TestProvidersComponent>
    );

describe('useCasePermission', () => {
  let hookResult: RenderHookResult<{}, boolean, Renderer<unknown>>;

  it('should return false if user has correct permissions and indicator has a name', () => {
    const mockedServices = {
      cases: {
        ...casesServiceMock,
        helpers: {
          ...casesServiceMock.helpers,
          canUseCases: () => ({
            create: true,
            update: true,
          }),
        },
      },
    };
    // @ts-ignore
    const ProviderComponent: FC = getProviderComponent(mockedServices);

    const indicatorName: string = 'abc';

    hookResult = renderHook(() => useCaseDisabled(indicatorName), {
      wrapper: ProviderComponent,
    });
    expect(hookResult.result.current).toEqual(false);
  });

  it(`should return true if user doesn't have correct permissions`, () => {
    const mockedServices = {
      cases: {
        ...casesServiceMock,
        helpers: {
          ...casesServiceMock.helpers,
          canUseCases: () => ({
            create: false,
            update: true,
          }),
        },
      },
    };
    // @ts-ignore
    const ProviderComponent: FC = getProviderComponent(mockedServices);

    const indicatorName: string = 'abc';

    hookResult = renderHook(() => useCaseDisabled(indicatorName), {
      wrapper: ProviderComponent,
    });
    expect(hookResult.result.current).toEqual(true);
  });

  it('should return true if indicator name is missing or empty', () => {
    const mockedServices = {
      cases: {
        ...casesServiceMock,
        helpers: {
          ...casesServiceMock.helpers,
          canUseCases: () => ({
            create: true,
            update: true,
          }),
        },
      },
    };
    // @ts-ignore
    const ProviderComponent: FC = getProviderComponent(mockedServices);

    const indicatorName: string = EMPTY_VALUE;

    hookResult = renderHook(() => useCaseDisabled(indicatorName), {
      wrapper: ProviderComponent,
    });
    expect(hookResult.result.current).toEqual(true);
  });
});
