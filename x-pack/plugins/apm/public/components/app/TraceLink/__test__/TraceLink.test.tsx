/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import { shallow } from 'enzyme';
import React from 'react';
import { TraceLink } from '../';
import * as hooks from '../../../../hooks/useFetcher';
import * as urlParamsHooks from '../../../../hooks/useUrlParams';
import { MockApmPluginContextWrapper } from '../../../../context/ApmPluginContext/MockApmPluginContext';

const renderOptions = { wrapper: MockApmPluginContextWrapper };

jest.mock('../../Main/route_config', () => ({
  routes: [
    {
      path: '/services/:serviceName/transactions/view',
      name: 'transaction_name',
    },
    {
      path: '/traces',
      name: 'traces',
    },
  ],
}));

describe('TraceLink', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('renders transition page', () => {
    const component = render(<TraceLink />, renderOptions);
    expect(component.getByText('Fetching trace...')).toBeDefined();
  });

  it('renders trace page when transaction is not found', () => {
    jest.spyOn(urlParamsHooks, 'useUrlParams').mockReturnValue({
      urlParams: {
        traceIdLink: '123',
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      },
      refreshTimeRange: jest.fn(),
      uiFilters: {},
    });
    jest.spyOn(hooks, 'useFetcher').mockReturnValue({
      data: { transaction: undefined },
      status: hooks.FETCH_STATUS.SUCCESS,
      refetch: jest.fn(),
    });

    const component = shallow(<TraceLink />);
    expect(component.prop('to')).toEqual(
      '/traces?kuery=trace.id%2520%253A%2520%2522123%2522&rangeFrom=now-24h&rangeTo=now'
    );
  });

  describe('transaction page', () => {
    beforeAll(() => {
      jest.spyOn(urlParamsHooks, 'useUrlParams').mockReturnValue({
        urlParams: {
          traceIdLink: '123',
          rangeFrom: 'now-24h',
          rangeTo: 'now',
        },
        refreshTimeRange: jest.fn(),
        uiFilters: {},
      });
    });
    it('renders with date range params', () => {
      const transaction = {
        service: { name: 'foo' },
        transaction: {
          id: '456',
          name: 'bar',
          type: 'GET',
        },
        trace: { id: 123 },
      };
      jest.spyOn(hooks, 'useFetcher').mockReturnValue({
        data: { transaction },
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });
      const component = shallow(<TraceLink />);
      expect(component.prop('to')).toEqual(
        '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=now-24h&rangeTo=now'
      );
    });
  });
});
