/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useNavigation } from '../../common/lib/kibana';
import { TestProviders } from '../../common/mock';
import type { UseDashboardAppLinkProps } from './use_dashboard_app_link';
import { useDashboardAppLink } from './use_dashboard_app_link';

jest.mock('../../common/lib/kibana', () => ({
  useNavigation: jest.fn(),
}));

describe('useDashboardAppLink', () => {
  const mockNavigateTo = jest.fn();
  const filters = [
    {
      meta: {
        index: 'security-solution-default',
        type: 'phrase',
        key: 'event.action',
        params: {
          query: 'host',
        },
        disabled: false,
        negate: false,
        alias: null,
      },
      query: {
        match_phrase: {
          'event.action': 'host',
        },
      },
      $state: {
        store: 'appState',
      },
    },
  ];
  const props = {
    query: {
      language: 'kuery',
      query: '',
    },
    filters: [],
    timeRange: {
      from: '2023-03-24T00:00:00.000Z',
      fromStr: 'now/d',
      to: '2023-03-24T23:59:59.999Z',
      toStr: 'now/d',
    },
    uiSettings: {
      get: jest.fn(),
    },
    savedObjectId: 'e2937420-c8ba-11ed-a7eb-3d08ee4d53cb',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      getAppUrl: jest
        .fn()
        .mockReturnValue('/app/dashboards#/view/e2937420-c8ba-11ed-a7eb-3d08ee4d53cb'),
      navigateTo: mockNavigateTo,
    });
  });
  it('create links to Dashboard app - with filters', () => {
    const testProps = { ...props, filters } as unknown as UseDashboardAppLinkProps;

    const { result } = renderHook(() => useDashboardAppLink(testProps), {
      wrapper: TestProviders,
    });
    expect(result.current.href).toMatchInlineSnapshot(
      `"/app/dashboards#/view/e2937420-c8ba-11ed-a7eb-3d08ee4d53cb?_g=(filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:security-solution-default,key:event.action,negate:!f,params:(query:host),type:phrase),query:(match_phrase:(event.action:host)))),query:(language:kuery,query:''),time:(from:now%2Fd,to:now%2Fd))"`
    );
  });

  it('create links to Dashboard app - with query', () => {
    const testProps = {
      ...props,
      query: {
        language: 'kuery',
        query: '@timestamp : *',
      },
    } as unknown as UseDashboardAppLinkProps;

    const { result } = renderHook(() => useDashboardAppLink(testProps), { wrapper: TestProviders });
    expect(result.current.href).toMatchInlineSnapshot(
      `"/app/dashboards#/view/e2937420-c8ba-11ed-a7eb-3d08ee4d53cb?_g=(filters:!(),query:(language:kuery,query:'@timestamp%20:%20*'),time:(from:now%2Fd,to:now%2Fd))"`
    );
  });

  it('create links to Dashboard app - with absolute time', () => {
    const testProps = {
      ...props,
      timeRange: {
        from: '2023-03-24T00:00:00.000Z',
        to: '2023-03-24T23:59:59.999Z',
      },
    } as unknown as UseDashboardAppLinkProps;

    const { result } = renderHook(() => useDashboardAppLink(testProps), { wrapper: TestProviders });
    expect(result.current.href).toMatchInlineSnapshot(
      `"/app/dashboards#/view/e2937420-c8ba-11ed-a7eb-3d08ee4d53cb?_g=(filters:!(),query:(language:kuery,query:''),time:(from:'2023-03-24T00:00:00.000Z',to:'2023-03-24T23:59:59.999Z'))"`
    );
  });

  it('navigate to dashboard app with preserved states', () => {
    const testProps = {
      ...props,
      timeRange: {
        from: '2023-03-24T00:00:00.000Z',
        to: '2023-03-24T23:59:59.999Z',
      },
    } as unknown as UseDashboardAppLinkProps;

    const { result } = renderHook(() => useDashboardAppLink(testProps), {
      wrapper: TestProviders,
    });
    result.current.onClick({
      preventDefault: jest.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>);

    expect(mockNavigateTo).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/app/dashboards#/view/e2937420-c8ba-11ed-a7eb-3d08ee4d53cb?_g=(filters:!(),query:(language:kuery,query:''),time:(from:'2023-03-24T00:00:00.000Z',to:'2023-03-24T23:59:59.999Z'))",
      })
    );
  });
});
