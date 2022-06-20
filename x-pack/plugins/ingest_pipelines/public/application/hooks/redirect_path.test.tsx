/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { createMemoryHistory } from 'history';
import { useRedirectToPathOrRedirectPath } from './redirect_path';
import { useKibana } from '../../shared_imports';

const mockedUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
jest.mock('../../shared_imports');

describe('useRedirectToPathOrRedirectPath', () => {
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
      '/app/management/ingest/ingest_pipelines/create?name=logs-system.syslog@custom&redirect_path=/test-redirect-path'
    );

    const {
      result: { current: redirectToPathOrRedirectPath },
    } = renderHook(() => useRedirectToPathOrRedirectPath(history));

    redirectToPathOrRedirectPath('/test');

    expect(mockedNavigateToUrl).toBeCalledWith('/test-redirect-path');
  });

  it('should redirect to the provided path if no redirect path is specified in the url', () => {
    const history = createMemoryHistory();
    history.push('/app/management/ingest/ingest_pipelines/create');

    const {
      result: { current: redirectToPathOrRedirectPath },
    } = renderHook(() => useRedirectToPathOrRedirectPath(history));

    redirectToPathOrRedirectPath('/test');

    expect(mockedNavigateToUrl).not.toBeCalled();
    expect(history.location.pathname).toBe('/test');
  });
});
