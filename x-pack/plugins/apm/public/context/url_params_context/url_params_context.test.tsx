/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import { History, Location } from 'history';
import moment from 'moment-timezone';
import * as React from 'react';
import { MemoryRouter, Router } from 'react-router-dom';
import type { UrlParams } from './types';
import { UrlParamsContext, UrlParamsProvider } from './url_params_context';

function mountParams(location: Location) {
  return mount(
    <MemoryRouter initialEntries={[location]}>
      <UrlParamsProvider>
        <UrlParamsContext.Consumer>
          {({ urlParams }: { urlParams: UrlParams }) => (
            <span id="data">{JSON.stringify(urlParams, null, 2)}</span>
          )}
        </UrlParamsContext.Consumer>
      </UrlParamsProvider>
    </MemoryRouter>
  );
}

function getDataFromOutput(wrapper: ReturnType<typeof mount>) {
  return JSON.parse(wrapper.find('#data').text());
}

describe('UrlParamsContext', () => {
  beforeAll(() => {
    moment.tz.setDefault('Etc/GMT');
  });

  afterAll(() => {
    moment.tz.setDefault('');
  });

  it('should read values in from location', () => {
    const location = {
      pathname: '/test/pathname',
      search:
        '?rangeFrom=2010-03-15T12:00:00Z&rangeTo=2010-04-10T12:00:00Z&transactionId=123abc',
    } as Location;

    const wrapper = mountParams(location);
    const params = getDataFromOutput(wrapper);

    expect([params.start, params.end]).toEqual([
      '2010-03-15T12:00:00.000Z',
      '2010-04-10T12:00:00.000Z',
    ]);
  });

  it('should update param values if location has changed', () => {
    const location = {
      pathname: '/test/updated',
      search:
        '?rangeFrom=2009-03-15T12:00:00Z&rangeTo=2009-04-10T12:00:00Z&transactionId=UPDATED',
    } as Location;

    const wrapper = mountParams(location);

    // force an update
    wrapper.setProps({ abc: 123 });
    const params = getDataFromOutput(wrapper);

    expect([params.start, params.end]).toEqual([
      '2009-03-15T12:00:00.000Z',
      '2009-04-10T12:00:00.000Z',
    ]);
  });

  it('should parse relative time ranges on mount', () => {
    const location = {
      pathname: '/test/updated',
      search: '?rangeFrom=now-1d%2Fd&rangeTo=now-1d%2Fd&transactionId=UPDATED',
    } as Location;

    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);

    const wrapper = mountParams(location);

    // force an update
    wrapper.setProps({ abc: 123 });
    const params = getDataFromOutput(wrapper);

    expect([params.start, params.end]).toEqual([
      '1969-12-31T00:00:00.000Z',
      '1969-12-31T23:59:59.999Z',
    ]);

    nowSpy.mockRestore();
  });

  it('should refresh the time range with new values', async () => {
    const calls = [];
    const history = {
      location: {
        pathname: '/test',
      },
      listen: jest.fn(),
    } as unknown as History;

    const wrapper = mount(
      <Router history={history}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams, refreshTimeRange }) => {
              calls.push({ urlParams });
              return (
                <React.Fragment>
                  <span id="data">{JSON.stringify(urlParams, null, 2)}</span>
                  <button
                    onClick={() =>
                      refreshTimeRange({
                        rangeFrom: '2005-09-20T12:00:00Z',
                        rangeTo: '2005-10-21T12:00:00Z',
                      })
                    }
                  />
                </React.Fragment>
              );
            }}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </Router>
    );

    await waitFor(() => {});

    expect(calls.length).toBe(1);

    wrapper.find('button').simulate('click');

    await waitFor(() => {});

    expect(calls.length).toBe(2);

    const params = getDataFromOutput(wrapper);

    expect([params.start, params.end]).toEqual([
      '2005-09-20T12:00:00.000Z',
      '2005-10-21T12:00:00.000Z',
    ]);
  });

  it('should refresh the time range with new values if time range is relative', async () => {
    const history = {
      location: {
        pathname: '/test',
      },
      listen: jest.fn(),
    } as unknown as History;

    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2000-06-15T12:00:00Z').getTime());

    const wrapper = mount(
      <Router history={history}>
        <UrlParamsProvider>
          <UrlParamsContext.Consumer>
            {({ urlParams, refreshTimeRange }) => {
              return (
                <React.Fragment>
                  <span id="data">{JSON.stringify(urlParams, null, 2)}</span>
                  <button
                    onClick={() =>
                      refreshTimeRange({
                        rangeFrom: 'now-1d/d',
                        rangeTo: 'now-1d/d',
                      })
                    }
                  />
                </React.Fragment>
              );
            }}
          </UrlParamsContext.Consumer>
        </UrlParamsProvider>
      </Router>
    );

    await waitFor(() => {});

    wrapper.find('button').simulate('click');

    await waitFor(() => {});

    const params = getDataFromOutput(wrapper);

    expect([params.start, params.end]).toEqual([
      '2000-06-14T00:00:00.000Z',
      '2000-06-14T23:59:59.999Z',
    ]);
  });
});
