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
import { RedirectWithOffset } from '.';
import { apmRouter } from '../../apm_route_config';
import * as useApmPluginContextExports from '../../../../context/apm_plugin/use_apm_plugin_context';
import { TimeRangeComparisonEnum } from '../../../shared/time_comparison/get_comparison_options';

describe('RedirectWithOffset', () => {
  let history: MemoryHistory;

  beforeEach(() => {
    history = createMemoryHistory();
  });

  function renderUrl(
    location: Pick<Location, 'pathname' | 'hash' | 'search'>,
    defaultSetting: boolean
  ) {
    history.replace(location);

    jest
      .spyOn(useApmPluginContextExports, 'useApmPluginContext')
      .mockReturnValue({
        core: {
          http: {
            basePath: {
              prepend: () => {},
            },
          },
          uiSettings: {
            get: () => defaultSetting,
          },
        },
      } as any);

    return render(
      <RouterProvider history={history} router={apmRouter as any}>
        <RedirectWithOffset>
          <>Foo</>
        </RedirectWithOffset>
      </RouterProvider>
    );
  }

  it('eventually renders the child element', async () => {
    const element = renderUrl(
      { pathname: '/services', search: location.search, hash: '' },
      false
    );

    await expect(element.findByText('Foo')).resolves.not.toBeUndefined();

    // assertion to make sure our element test actually works
    await expect(element.findByText('Bar')).rejects.not.toBeUndefined();
  });

  it('redirects with comparisonEnabled=false when comparison is disabled in advanced settings', async () => {
    renderUrl(
      { pathname: '/services', search: location.search, hash: '' },
      false
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.comparisonEnabled).toBe('false');
  });

  it('redirects with comparisonEnabled=true when comparison is enabled in advanced settings', async () => {
    renderUrl(
      { pathname: '/services', search: location.search, hash: '' },
      true
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.comparisonEnabled).toBe('true');
  });

  it('does not redirect when comparisonEnabled is defined in the url', async () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({
          comparisonEnabled: 'false',
        }),
        hash: '',
      },
      true
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.comparisonEnabled).toBe('false');
  });

  it('redirects with offset=1d when comparisonType=day is set in the query params', () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({
          comparisonType: TimeRangeComparisonEnum.DayBefore,
        }),
        hash: '',
      },
      true
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.offset).toBe('1d');
  });

  it('redirects with offset=1w when comparisonType=week is set in the query params', () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({
          comparisonType: TimeRangeComparisonEnum.WeekBefore,
        }),
        hash: '',
      },
      true
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.offset).toBe('1w');
  });

  it('redirects without offset when comparisonType=period is set in the query params', () => {
    renderUrl(
      {
        pathname: '/services',
        search: qs.stringify({
          comparisonType: TimeRangeComparisonEnum.PeriodBefore,
        }),
        hash: '',
      },
      true
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.offset).toBeUndefined();
  });

  it('without offset when comparisonType=period is set in the query params', () => {
    renderUrl(
      {
        pathname: '',
        search: qs.stringify({
          comparisonType: TimeRangeComparisonEnum.PeriodBefore,
        }),
        hash: 'services',
      },
      true
    );

    const query = qs.parse(history.entries[0].search);
    expect(query.offset).toBeUndefined();
  });
});
