/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouterProvider } from '@kbn/typed-react-router-config';
import { render } from '@testing-library/react';
import { createMemoryHistory, Location, MemoryHistory } from 'history';
import qs from 'query-string';
import { RedirectWithDefaultEnvironment } from './';
import { apmRouter } from '../../routing/apm_route_config';
import * as useApmPluginContextExports from '../../../context/apm_plugin/use_apm_plugin_context';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';

describe('RedirectWithDefaultEnvironment', () => {
  let history: MemoryHistory;

  beforeEach(() => {
    history = createMemoryHistory();
  });

  function renderUrl(
    location: Pick<Location, 'pathname' | 'search'>,
    defaultSetting: string
  ) {
    history.replace(location);

    jest
      .spyOn(useApmPluginContextExports, 'useApmPluginContext')
      .mockReturnValue({
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
    const element = renderUrl(
      {
        pathname: '/services',
        search: location.search,
      },
      ''
    );

    await expect(element.findByText('Foo')).resolves.not.toBeUndefined();

    // assertion to make sure our element test actually works
    await expect(element.findByText('Bar')).rejects.not.toBeUndefined();
  });

  it('redirects to ENVIRONMENT_ALL if not set', async () => {
    renderUrl(
      {
        pathname: '/services',
        search: location.search,
      },
      ''
    );

    expect(qs.parse(history.entries[0].search).environment).toEqual(
      ENVIRONMENT_ALL.value
    );
  });

  it('redirects to the default environment if set', () => {
    renderUrl(
      {
        pathname: '/services',
        search: location.search,
      },
      'production'
    );

    expect(qs.parse(history.entries[0].search).environment).toEqual(
      'production'
    );
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

    expect(qs.parse(history.entries[0].search).environment).toEqual(
      'development'
    );
  });

  it('does not redirect for the service overview', () => {
    renderUrl(
      {
        pathname: '/services/opbeans-java',
        search: location.search,
      },
      ''
    );

    expect(qs.parse(history.entries[0].search).environment).toBeUndefined();
  });
});
