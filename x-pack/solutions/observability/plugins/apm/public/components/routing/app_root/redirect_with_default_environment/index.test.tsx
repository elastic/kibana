/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { render, waitFor } from '@testing-library/react';
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

  function renderUrl(location: Pick<Location, 'pathname' | 'search'>, defaultSetting: string) {
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
    const view = renderUrl(
      {
        pathname: '/services',
        search: noQuery,
      },
      ''
    );

    expect(await view.findByText('Foo')).toBeInTheDocument();
    expect(view.queryByText('Bar')).not.toBeInTheDocument();
  });

  it('redirects to ENVIRONMENT_ALL if not set', async () => {
    renderUrl(
      {
        pathname: '/services',
        search: noQuery,
      },
      ''
    );

    expect(qs.parse(history.entries[0].search).environment).toEqual(ENVIRONMENT_ALL.value);
  });

  it('preserves existing query when adding default environment', async () => {
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

  it('redirects to the default environment if set', () => {
    renderUrl(
      {
        pathname: '/services',
        search: noQuery,
      },
      'production'
    );

    expect(qs.parse(history.entries[0].search).environment).toEqual('production');
  });

  it('does not redirect when an environment has been set', () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({
          environment: 'development',
        }),
      },
      'production'
    );

    expect(qs.parse(history.entries[0].search).environment).toEqual('development');
  });

  it('does not redirect for the service overview', () => {
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: noQuery,
      },
      ''
    );

    expect(qs.parse(history.entries[0].search).environment).toBeUndefined();
  });
});
