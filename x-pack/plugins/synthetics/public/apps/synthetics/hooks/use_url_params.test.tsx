/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import userEvent from '@testing-library/user-event';
import { render } from '../utils/testing';
import React, { useState, Fragment } from 'react';
import { useUrlParams, SyntheticsUrlParamsHook } from './use_url_params';
import { APP_DEFAULT_REFRESH_INTERVAL, SyntheticsRefreshContext } from '../contexts';

interface MockUrlParamsComponentProps {
  hook: SyntheticsUrlParamsHook;
  updateParams?: { [key: string]: any } | null;
}

const UseUrlParamsTestComponent = ({
  hook,
  updateParams = { dateRangeStart: 'now-12d', dateRangeEnd: 'now' },
}: MockUrlParamsComponentProps) => {
  const [params, setParams] = useState({});
  const [getUrlParams, updateUrlParams] = hook();
  const queryParams = getUrlParams();
  return (
    <Fragment>
      {Object.keys(params).length > 0 ? <div>{JSON.stringify(params)}</div> : null}
      <button
        id="setUrlParams"
        onClick={() => {
          updateUrlParams(updateParams);
        }}
      >
        Set url params
      </button>
      <button id="getUrlParams" onClick={() => setParams(queryParams)}>
        Get url params
      </button>
    </Fragment>
  );
};

describe('useUrlParams', () => {
  let dateMathSpy: any;
  const MOCK_DATE_VALUE = 20;

  beforeEach(() => {
    dateMathSpy = jest.spyOn(DateMath, 'parse');
    dateMathSpy.mockReturnValue(MOCK_DATE_VALUE);
  });

  it('accepts router props, updates URL params, and returns the current params', async () => {
    const { findByText, history } = render(
      <SyntheticsRefreshContext.Provider
        value={{
          lastRefresh: 123,
          refreshApp: jest.fn(),
          refreshInterval: APP_DEFAULT_REFRESH_INTERVAL,
        }}
      >
        <UseUrlParamsTestComponent hook={useUrlParams} />
      </SyntheticsRefreshContext.Provider>
    );

    const pushSpy = jest.spyOn(history, 'push');

    const setUrlParamsButton = await findByText('Set url params');
    userEvent.click(setUrlParamsButton);
    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/',
      search: 'dateRangeEnd=now&dateRangeStart=now-12d',
    });
    pushSpy.mockClear();
  });

  it('clears search when null is passed to params', async () => {
    const { findByText, history } = render(
      <SyntheticsRefreshContext.Provider
        value={{
          lastRefresh: 123,
          refreshApp: jest.fn(),
          refreshInterval: APP_DEFAULT_REFRESH_INTERVAL,
        }}
      >
        <UseUrlParamsTestComponent hook={useUrlParams} updateParams={null} />
      </SyntheticsRefreshContext.Provider>
    );

    const pushSpy = jest.spyOn(history, 'push');

    const setUrlParamsButton = await findByText('Set url params');
    userEvent.click(setUrlParamsButton);
    expect(pushSpy).toHaveBeenCalledWith({
      pathname: '/',
      search: undefined,
    });
    pushSpy.mockClear();
  });
});
