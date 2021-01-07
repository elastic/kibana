/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { act, render, waitFor } from '@testing-library/react';
import { shallow } from 'enzyme';
import React, { ReactNode } from 'react';
import { MemoryRouter, RouteComponentProps } from 'react-router-dom';
import { TraceLink } from './';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as hooks from '../../../hooks/use_fetcher';
import * as urlParamsHooks from '../../../context/url_params_context/use_url_params';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper
        value={
          ({
            ...mockApmPluginContextValue,
            core: {
              ...mockApmPluginContextValue.core,
              http: { ...mockApmPluginContextValue.core.http, get: jest.fn() },
            },
          } as unknown) as ApmPluginContextValue
        }
      >
        {children}
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

const renderOptions = { wrapper: Wrapper };

describe('TraceLink', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders a transition page', async () => {
    const props = ({
      match: { params: { traceId: 'x' } },
    } as unknown) as RouteComponentProps<{ traceId: string }>;
    let result;
    act(() => {
      const component = render(<TraceLink {...props} />, renderOptions);

      result = component.getByText('Fetching trace...');
    });
    await waitFor(() => {});
    expect(result).toBeDefined();
  });

  describe('when no transaction is found', () => {
    it('renders a trace page', () => {
      jest.spyOn(urlParamsHooks, 'useUrlParams').mockReturnValue({
        urlParams: {
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

      const props = ({
        match: { params: { traceId: '123' } },
      } as unknown) as RouteComponentProps<{ traceId: string }>;
      const component = shallow(<TraceLink {...props} />);

      expect(component.prop('to')).toEqual(
        '/traces?kuery=trace.id%2520%253A%2520%2522123%2522&rangeFrom=now-24h&rangeTo=now'
      );
    });
  });

  describe('transaction page', () => {
    beforeAll(() => {
      jest.spyOn(urlParamsHooks, 'useUrlParams').mockReturnValue({
        urlParams: {
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

      const props = ({
        match: { params: { traceId: '123' } },
      } as unknown) as RouteComponentProps<{ traceId: string }>;
      const component = shallow(<TraceLink {...props} />);

      expect(component.prop('to')).toEqual(
        '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=now-24h&rangeTo=now'
      );
    });
  });
});
