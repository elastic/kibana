/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { UrlParamsContext, UrlParamsProvider } from '..';
import { mount } from 'enzyme';
import * as hooks from '../../../hooks/useLocation';
import { Location } from 'history';
import { IUrlParams } from '../types';

function mountParams() {
  return mount(
    <UrlParamsProvider>
      <UrlParamsContext.Consumer>
        {({ urlParams }: { urlParams: IUrlParams }) => (
          <span id="data">{JSON.stringify(urlParams, null, 2)}</span>
        )}
      </UrlParamsContext.Consumer>
    </UrlParamsProvider>
  );
}

function getDataFromOutput(wrapper: ReturnType<typeof mount>) {
  return JSON.parse(wrapper.find('#data').text());
}

describe('UrlParamsContext', () => {
  let mockLocation: Location;

  beforeEach(() => {
    mockLocation = { pathname: '/test/pathname' } as Location;
    jest.spyOn(hooks, 'useLocation').mockImplementation(() => mockLocation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should have default params', () => {
    jest
      .spyOn(Date, 'now')
      .mockImplementation(() => new Date('2000-06-15T12:00:00Z').getTime());
    const wrapper = mountParams();
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
    mockLocation.search =
      '?rangeFrom=2010-03-15T12:00:00Z&rangeTo=2010-04-10T12:00:00Z&transactionId=123abc';
    const wrapper = mountParams();
    const params = getDataFromOutput(wrapper);
    expect(params.start).toEqual('2010-03-15T12:00:00.000Z');
    expect(params.end).toEqual('2010-04-10T12:00:00.000Z');
  });

  it('should update param values if location has changed', () => {
    const wrapper = mountParams();
    mockLocation = {
      pathname: '/test/updated',
      search:
        '?rangeFrom=2009-03-15T12:00:00Z&rangeTo=2009-04-10T12:00:00Z&transactionId=UPDATED'
    } as Location;
    // force an update
    wrapper.setProps({ abc: 123 });
    const params = getDataFromOutput(wrapper);
    expect(params.start).toEqual('2009-03-15T12:00:00.000Z');
    expect(params.end).toEqual('2009-04-10T12:00:00.000Z');
  });

  it('should refresh the time range with new values', () => {
    const wrapper = mount(
      <UrlParamsProvider>
        <UrlParamsContext.Consumer>
          {({ urlParams, refreshTimeRange }) => {
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
    );
    wrapper.find('button').simulate('click');
    const data = getDataFromOutput(wrapper);
    expect(data.start).toEqual('2005-09-20T12:00:00.000Z');
    expect(data.end).toEqual('2005-10-21T12:00:00.000Z');
  });
});
