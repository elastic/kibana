/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { Filter } from '@kbn/es-query';
import { NotificationsStart } from '@kbn/core-notifications-browser';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ActionAlertsFilterQuery } from './action_alerts_filter_query';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockDataPlugin = dataPluginMock.createStartContract();
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useKibana: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const queryClient = new QueryClient();
const defaultStateMock = {
  kql: '',
  filters: [],
};

describe('ActionAlertsFilterQuery', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn().mockImplementation((props) => (
              <button
                data-test-subj="querySubmitButton"
                onClick={() => props.onQuerySubmit({ dateRange: { from: 'now', to: 'now' } })}
                type="button"
              >
                {'Hello world'}
              </button>
            )),
          },
        },
        notifications: { toasts: { addWarning: jest.fn() } } as unknown as NotificationsStart,
      },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ActionAlertsFilterQuery
          state={defaultStateMock}
          onChange={jest.fn()}
          appName={'test'}
          featureIds={['observability', 'stackAlerts']}
        />
      </QueryClientProvider>
    );

    expect(screen.getByTestId('alertsFilterQueryToggle')).toBeInTheDocument();
  });

  it('renders kql query correctly', async () => {
    const stateMock = {
      kql: 'id: *',
      filters: [],
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ActionAlertsFilterQuery
          state={stateMock}
          onChange={jest.fn()}
          appName={'test'}
          featureIds={['observability', 'stackAlerts']}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('querySubmitButton'));
  });

  it('renders filters correctly', async () => {
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
        $state: { store: 'appState' },
      },
    ] as Filter[];
    const stateMock = {
      ...defaultStateMock,
      filters,
    };

    mockUseKibana.mockReturnValue({
      services: {
        data: mockDataPlugin,
        unifiedSearch: {
          ui: {
            SearchBar: jest.fn().mockImplementation((props) => (
              <button
                data-test-subj="filtersSubmitButton"
                onClick={() => props.onFiltersUpdated(filters)}
                type="button"
              >
                {'Hello world'}
              </button>
            )),
          },
        },
        notifications: { toasts: { addWarning: jest.fn() } } as unknown as NotificationsStart,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ActionAlertsFilterQuery
          state={stateMock}
          onChange={jest.fn()}
          appName={'test'}
          featureIds={['observability', 'stackAlerts']}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('filtersSubmitButton'));
  });

  it('calls onChange correctly', async () => {
    const onChangeMock = jest.fn();
    const filters = [
      {
        meta: {
          negate: false,
          alias: null,
          disabled: false,
          type: 'custom',
          key: 'query',
        },
        query: { bool: { filter: [{ term: { 'kibana.alert.rule.consumer': 'stackAlerts' } }] } },
        $state: { store: 'appState' },
      },
    ] as Filter[];
    const stateMock = {
      ...defaultStateMock,
      filters,
    };

    render(
      <QueryClientProvider client={queryClient}>
        <ActionAlertsFilterQuery
          state={stateMock}
          onChange={onChangeMock}
          appName={'test'}
          featureIds={['observability', 'stackAlerts']}
        />
      </QueryClientProvider>
    );

    fireEvent.click(await screen.findByTestId('alertsFilterQueryToggle'));

    expect(onChangeMock).toHaveBeenCalled();
  });
});
