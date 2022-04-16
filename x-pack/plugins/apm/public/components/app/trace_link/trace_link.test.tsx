/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, waitFor } from '@testing-library/react';
import { shallow } from 'enzyme';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TraceLink } from '.';
import { ApmPluginContextValue } from '../../../context/apm_plugin/apm_plugin_context';
import {
  mockApmPluginContextValue,
  MockApmPluginContextWrapper,
} from '../../../context/apm_plugin/mock_apm_plugin_context';
import * as hooks from '../../../hooks/use_fetcher';
import * as useApmParamsHooks from '../../../hooks/use_apm_params';

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper
        value={
          {
            ...mockApmPluginContextValue,
            core: {
              ...mockApmPluginContextValue.core,
              http: { ...mockApmPluginContextValue.core.http, get: jest.fn() },
            },
          } as unknown as ApmPluginContextValue
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
    jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
      path: {
        traceId: 'x',
      },
      query: {
        rangeFrom: 'now-24h',
        rangeTo: 'now',
      },
    });

    let result;
    act(() => {
      const component = render(<TraceLink />, renderOptions);

      result = component.getByText('Fetching trace...');
    });
    await waitFor(() => {});
    expect(result).toBeDefined();
  });

  describe('when no transaction is found', () => {
    it('renders a trace page', () => {
      jest.spyOn(hooks, 'useFetcher').mockReturnValue({
        data: { transaction: undefined },
        status: hooks.FETCH_STATUS.SUCCESS,
        refetch: jest.fn(),
      });

      jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
        path: {
          traceId: '123',
        },
        query: {
          rangeFrom: 'now-24h',
          rangeTo: 'now',
        },
      });

      const component = shallow(<TraceLink />);

      expect(component.prop('to')).toEqual(
        '/traces?kuery=trace.id%20%3A%20%22123%22&rangeFrom=now-24h&rangeTo=now'
      );
    });
  });

  describe('transaction page', () => {
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

      jest.spyOn(useApmParamsHooks as any, 'useApmParams').mockReturnValue({
        path: {
          traceId: '123',
        },
        query: {
          rangeFrom: 'now-24h',
          rangeTo: 'now',
        },
      });

      const component = shallow(<TraceLink />);

      expect(component.prop('to')).toEqual(
        '/services/foo/transactions/view?traceId=123&transactionId=456&transactionName=bar&transactionType=GET&rangeFrom=now-24h&rangeTo=now'
      );
    });
  });
});
