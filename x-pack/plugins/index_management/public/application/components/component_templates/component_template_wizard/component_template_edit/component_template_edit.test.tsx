/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import { useRedirectPath, useTabFromQueryString } from './component_template_edit';
import { useKibana } from '../../../..';

const mockedUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
jest.mock('../../../..');

describe('useRedirectPath', () => {
  const mockedNavigateToUrl = jest.fn();
  beforeEach(() => {
    mockedNavigateToUrl.mockReset();
    mockedUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToUrl: mockedNavigateToUrl,
        },
      },
    } as any);
  });
  it('should redirect to redirect path if a redirect path is specified in the url', () => {
    const history = createMemoryHistory();
    history.push(
      '/app/management/data/index_management/edit_component_template?redirect_path=/test-redirect-path'
    );

    const {
      result: { current: redirectToPathOrRedirectPath },
    } = renderHook(() => useRedirectPath(history));

    redirectToPathOrRedirectPath({ pathname: '/test' });

    expect(mockedNavigateToUrl).toBeCalledWith('/test-redirect-path');
  });

  it('should redirect to the provided path if no redirect path is specified in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template');

    const {
      result: { current: redirectToPathOrRedirectPath },
    } = renderHook(() => useRedirectPath(history));

    redirectToPathOrRedirectPath({ pathname: '/test' });

    expect(mockedNavigateToUrl).not.toBeCalled();
    expect(history.location.pathname).toBe('/test');
  });
});

describe('useTabFromQueryString', () => {
  it('should return undefined if not tab is set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template');

    const {
      result: { current: tab },
    } = renderHook(() => useTabFromQueryString(history));

    expect(tab).not.toBeDefined();
  });

  it('should return the tab if set in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template?tab=mappings');

    const {
      result: { current: tab },
    } = renderHook(() => useTabFromQueryString(history));

    expect(tab).toBe('mappings');
  });
});
