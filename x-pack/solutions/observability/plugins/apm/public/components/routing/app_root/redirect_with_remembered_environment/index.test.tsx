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
import { RedirectWithRememberedEnvironment } from '.';
import { apmRouter } from '../../apm_route_config';
import * as useApmPluginContextExports from '../../../../context/apm_plugin/use_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { fromQuery } from '../../../shared/links/url_helpers';

describe('RedirectWithRememberedEnvironment', () => {
  let history: MemoryHistory;
  let view: ReturnType<typeof render> | undefined;

  const noQuery = '';

  beforeEach(() => {
    history = createMemoryHistory();
  });

  afterEach(() => {
    // Unmount clears the module-level memory (leave-APM cleanup).
    view?.unmount();
    view = undefined;
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

    view = render(
      <RouterProvider history={history} router={apmRouter as any}>
        <RedirectWithRememberedEnvironment>
          <>Foo</>
        </RedirectWithRememberedEnvironment>
      </RouterProvider>
    );
    return view;
  }

  it('defaults to ENVIRONMENT_ALL when nothing is remembered', async () => {
    renderUrl({ pathname: '/services', search: noQuery }, '');

    expect(qs.parse(history.location.search).environment).toEqual(ENVIRONMENT_ALL.value);
    expect(await view!.findByText('Foo')).toBeInTheDocument();
  });

  it('defaults to the advanced-setting environment when configured', () => {
    renderUrl({ pathname: '/services', search: noQuery }, 'production');

    expect(qs.parse(history.location.search).environment).toEqual('production');
  });

  it('preserves other query params when adding the default environment', async () => {
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

  it('does not override an explicit environment', () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({ environment: 'development' }),
      },
      'production'
    );

    expect(qs.parse(history.location.search).environment).toEqual('development');
  });

  it('restores the environment from a service detail page onto bare /services', async () => {
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

  it('uses the default on a second bare /services visit after leaving inventory', async () => {
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

    act(() => {
      history.push({ pathname: '/traces', search: noQuery });
    });
    act(() => {
      history.push({ pathname: '/services', search: noQuery });
    });

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual('production');
    });
  });

  it('does not restore after visiting traces from a service detail page', async () => {
    // Memory is only for the immediate jump detail → inventory. Visiting another
    // APM page (traces) clears it.
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: qs.stringify({ environment: 'staging' }),
      },
      'production'
    );

    act(() => {
      history.push({ pathname: '/traces', search: noQuery });
    });
    act(() => {
      history.push({ pathname: '/services', search: noQuery });
    });

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual('production');
    });
  });

  it('uses the default after unmounting and remounting (leaving APM)', async () => {
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: qs.stringify({ environment: 'staging' }),
      },
      'production'
    );

    view!.unmount();
    view = undefined;

    renderUrl({ pathname: '/services', search: noQuery }, 'production');

    await waitFor(() => {
      expect(qs.parse(history.location.search).environment).toEqual('production');
    });
  });
});
