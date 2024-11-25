/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import { createMemoryHistory } from 'history';
import { useRedirectPath } from './redirect_path';
import { useKibana } from '..';

const mockedUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
jest.mock('..');

describe('useRedirectPath', () => {
  const mockStart = coreMock.createStart();
  beforeEach(() => {
    mockStart.application.navigateToUrl.mockReset();
    mockedUseKibana.mockReturnValue({
      services: {
        application: mockStart.application,
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

    expect(mockStart.application.navigateToUrl).toBeCalledWith('/test-redirect-path');
  });

  it('should redirect to the provided path if no redirect path is specified in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/data/index_management/edit_component_template');

    const {
      result: { current: redirectToPathOrRedirectPath },
    } = renderHook(() => useRedirectPath(history));

    redirectToPathOrRedirectPath({ pathname: '/test' });

    expect(mockStart.application.navigateToUrl).not.toBeCalled();
    expect(history.location.pathname).toBe('/test');
  });
});
