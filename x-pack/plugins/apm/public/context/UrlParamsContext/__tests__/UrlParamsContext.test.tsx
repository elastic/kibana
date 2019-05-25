/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { UrlParamsContext, UrlParamsProvider } from '..';
import { mount } from 'enzyme';
import { Location, History } from 'history';
import { MemoryRouter, Router } from 'react-router-dom';
import { IUrlParams } from '../types';
import { tick } from '../../../utils/testHelpers';

function mountParams(location: Location) {
  return mount(
    <MemoryRouter initialEntries={[location]}>
      <UrlParamsProvider>
        <UrlParamsContext.Consumer>
          {({ urlParams }: { urlParams: IUrlParams }) => (
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
  it('should have default params', () => {
    const location = { pathname: '/test/pathname' } as Location;

    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2000-06-15T12:00:00Z').getTime());
    const wrapper = mountParams(location);
    const params = getDataFromOutput(wrapper);

    expect(params).toEqual({
      start: '2000-06-14T12:00:00.000Z',
      serviceName: 'test',
      end: '2000-06-15T12:00:00.000Z',
      page: 0,
      processorEvent: 'transaction',
      rangeFrom: 'now-24h',
      rangeTo: 'now',
      refreshInterval: 0,
      refreshPaused: true
    });
  });

  it('should read values in from location', () => {
    const location = {
      pathname: '/test/pathname',
      search:
        '?rangeFrom=2010-03-15T12:00:00Z&rangeTo=2010-04-10T12:00:00Z&transactionId=123abc'
    } as Location;

    const wrapper = mountParams(location);
    const params = getDataFromOutput(wrapper);
    expect(params.start).toEqual('2010-03-15T12:00:00.000Z');
    expect(params.end).toEqual('2010-04-10T12:00:00.000Z');
  });

  it('should update param values if location has changed', () => {
    const location = {
      pathname: '/test/updated',
      search:
        '?rangeFrom=2009-03-15T12:00:00Z&rangeTo=2009-04-10T12:00:00Z&transactionId=UPDATED'
    } as Location;

    const wrapper = mountParams(location);

    // force an update
    wrapper.setProps({ abc: 123 });
    const params = getDataFromOutput(wrapper);
    expect(params.start).toEqual('2009-03-15T12:00:00.000Z');
    expect(params.end).toEqual('2009-04-10T12:00:00.000Z');
  });

  it('should refresh the time range with new values', async () => {
    const calls = [];
    const history = ({
      location: {
        pathname: '/test'
      },
      listen: jest.fn()
    } as unknown) as History;

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
                        rangeTo: '2005-10-21T12:00:00Z'
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

    await tick();

    expect(calls.length).toBe(1);

    wrapper.find('button').simulate('click');

    await tick();

    expect(calls.length).toBe(2);

    const params = getDataFromOutput(wrapper);
    expect(params.start).toEqual('2005-09-20T12:00:00.000Z');
    expect(params.end).toEqual('2005-10-21T12:00:00.000Z');
  });
});
