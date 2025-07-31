/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { History, Location } from 'history';
import moment from 'moment-timezone';
import { MemoryRouter, Router } from '@kbn/shared-ux-router';
import type { UrlParams } from './types';
import { UrlParamsContext, UrlParamsProvider } from './url_params_context';

function renderParams(location: Location) {
  return render(
    <MemoryRouter initialEntries={[location]}>
      <UrlParamsProvider>
        <UrlParamsContext.Consumer>
          {({ urlParams }: { urlParams: UrlParams }) => (
            <span data-test-subj="url-params">{JSON.stringify(urlParams, null, 2)}</span>
          )}
        </UrlParamsContext.Consumer>
      </UrlParamsProvider>
    </MemoryRouter>
  );
}

function getUrlParams(): UrlParams {
  return JSON.parse(screen.getByTestId('url-params').textContent || '');
}

describe('UrlParamsContext', () => {
  beforeAll(() => {
    moment.tz.setDefault('Etc/GMT');
  });

  afterAll(() => {
    moment.tz.setDefault('');
  });

  it('reads values from location', () => {
    const location = {
      pathname: '/test/pathname',
      search: '?rangeFrom=2010-03-15T12:00:00Z&rangeTo=2010-04-10T12:00:00Z&transactionId=123abc',
    } as Location;

    renderParams(location);
    const params = getUrlParams();

    expect([params.start, params.end]).toEqual([
      '2010-03-15T12:00:00.000Z',
      '2010-04-10T12:00:00.000Z',
    ]);
  });

  it('updates param values when location changes', () => {
    const location = {
      pathname: '/test/updated',
      search: '?rangeFrom=2009-03-15T12:00:00Z&rangeTo=2009-04-10T12:00:00Z&transactionId=UPDATED',
    } as Location;

    renderParams(location);
    const params = getUrlParams();

    expect([params.start, params.end]).toEqual([
      '2009-03-15T12:00:00.000Z',
      '2009-04-10T12:00:00.000Z',
    ]);
  });

  it('parses relative time ranges on mount', () => {
    const location = {
      pathname: '/test/updated',
      search: '?rangeFrom=now-1d%2Fd&rangeTo=now-1d%2Fd&transactionId=UPDATED',
    } as Location;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);

    renderParams(location);
    const params = getUrlParams();

    expect([params.start, params.end]).toEqual([
      '1969-12-31T00:00:00.000Z',
      '1969-12-31T23:59:59.999Z',
    ]);

    nowSpy.mockRestore();
  });

  it('refreshes the time range with new values', async () => {
    const user = userEvent.setup();
    const history = {
      location: { pathname: '/test' },
      listen: jest.fn(),
    } as unknown as History;

    render(
      <Router history={history}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams, refreshTimeRange }) => (
              <>
                <span data-test-subj="url-params">{JSON.stringify(urlParams, null, 2)}</span>
                <button
                  onClick={() =>
                    refreshTimeRange({
                      rangeFrom: '2005-09-20T12:00:00Z',
                      rangeTo: '2005-10-21T12:00:00Z',
                    })
                  }
                  data-test-subj="refresh-button"
                />
              </>
            )}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </Router>
    );

    await user.click(screen.getByTestId('refresh-button'));

    await waitFor(() => {
      const params = getUrlParams();
      expect([params.start, params.end]).toEqual([
        '2005-09-20T12:00:00.000Z',
        '2005-10-21T12:00:00.000Z',
      ]);
    });
  });

  it('refreshes the time range with relative values', async () => {
    const user = userEvent.setup();
    const history = {
      location: { pathname: '/test' },
      listen: jest.fn(),
    } as unknown as History;

    jest.spyOn(Date, 'now').mockImplementation(() => new Date('2000-06-15T12:00:00Z').getTime());

    render(
      <Router history={history}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams, refreshTimeRange }) => (
              <>
                <span data-test-subj="url-params">{JSON.stringify(urlParams, null, 2)}</span>
                <button
                  onClick={() =>
                    refreshTimeRange({
                      rangeFrom: 'now-1d/d',
                      rangeTo: 'now-1d/d',
                    })
                  }
                  data-test-subj="refresh-button"
                />
              </>
            )}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </Router>
    );

    await user.click(screen.getByTestId('refresh-button'));

    await waitFor(() => {
      const params = getUrlParams();
      expect([params.start, params.end]).toEqual([
        '2000-06-14T00:00:00.000Z',
        '2000-06-14T23:59:59.999Z',
      ]);
    });
  });
});
