/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { act, render, waitFor } from '@testing-library/react';
import type { Location, MemoryHistory } from 'history';
import { createMemoryHistory } from 'history';
import qs from 'query-string';
import { RedirectWithDefaultEnvironment } from '.';
import { apmRouter } from '../../apm_route_config';
import * as useApmPluginContextExports from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { fromQuery } from '../../../shared/links/url_helpers';

describe('RedirectWithDefaultEnvironment', () => {
  let history: MemoryHistory;

  const noQuery = '';

  beforeEach(() => {
    history = createMemoryHistory();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function renderUrl(
    location: Pick<Location, 'pathname' | 'search'> & Partial<Pick<Location, 'hash'>>,
    defaultSetting: string
  ) {
    history.replace(location);

    jest.spyOn(useApmPluginContextExports, 'useApmPluginContext').mockReturnValue({
      core: {
        uiSettings: {
          get: () => defaultSetting,
        },
      },
    } as any);

    return render(
      <RouterProvider history={history} router={apmRouter as any}>
        <RedirectWithDefaultEnvironment>
          <>Foo</>
        </RedirectWithDefaultEnvironment>
      </RouterProvider>
    );
  }

  it('eventually renders the child element', async () => {
    const view = renderUrl({ pathname: '/services', search: noQuery }, '');

    expect(await view.findByText('Foo')).toBeInTheDocument();
    expect(view.queryByText('Bar')).not.toBeInTheDocument();
  });

  it('redirects to ENVIRONMENT_ALL if no environment is set', async () => {
    renderUrl({ pathname: '/services', search: noQuery }, '');

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual(ENVIRONMENT_ALL.value);
    });
  });

  it('redirects to the default environment if configured', async () => {
    renderUrl({ pathname: '/services', search: noQuery }, 'production');

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual('production');
    });
  });

  it('preserves the existing query when adding the default environment', async () => {
    renderUrl(
      {
        pathname: '/services',
        search: fromQuery({
          rangeFrom: 'now-15m',
          rangeTo: 'now',
        }),
      },
      ''
    );

    await waitFor(() => {
      const parsed = qs.parse(history.location.search);
      expect(parsed.environment).toEqual(ENVIRONMENT_ALL.value);
      expect(parsed.rangeFrom).toEqual('now-15m');
      expect(parsed.rangeTo).toEqual('now');
    });
  });

  it('does not redirect when an environment has been set', () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({ environment: 'development' }),
      },
      'production'
    );

    expect(qs.parse(history.location.search).environment).toEqual('development');
  });

  it('does not redirect for a service detail page', () => {
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: noQuery,
      },
      ''
    );

    expect(qs.parse(history.location.search).environment).toBeUndefined();
  });

  it('restores the environment when navigating directly to the service inventory', async () => {
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: qs.stringify({ environment: 'staging' }),
      },
      'production'
    );

    act(() => {
      history.push({ pathname: '/services', search: noQuery });
    });

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual('staging');
    });
  });

  it('does not redirect when a legacy hash URL lands on the root, preserving the hash for RenderRedirectTo', () => {
    const legacyHash = '#/services/opbeans-java/service-map?environment=staging';

    renderUrl(
      {
        pathname: '',
        search: noQuery,
        hash: legacyHash,
      },
      'production'
    );

    // The hash carries the real route (and its environment); redirecting here would drop it
    // before the `/` route's RenderRedirectTo can convert it to a path.
    expect(history.location.hash).toEqual(legacyHash);
    expect(qs.parse(history.location.search).environment).toBeUndefined();
  });

  it('restores the environment when navigating to the APM root', async () => {
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: qs.stringify({ environment: 'staging' }),
      },
      'production'
    );

    act(() => {
      history.push({ pathname: '/', search: noQuery });
    });

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual('staging');
    });
  });
});
