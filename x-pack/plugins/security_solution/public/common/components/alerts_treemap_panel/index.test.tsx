/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { useLocation } from 'react-router-dom';

import { SecurityPageName } from '../../../../common/constants';
import {
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../detections/components/alerts_kpis/common/config';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ChartContextMenu } from '../../../detections/pages/detection_engine/chart_panels/chart_context_menu';
import { ChartSelect } from '../../../detections/pages/detection_engine/chart_panels/chart_select';
import { TestProviders } from '../../mock/test_providers';
import type { Props } from '.';
import { AlertsTreemapPanel } from '.';
import { mockAlertSearchResponse } from '../alerts_treemap/lib/mocks/mock_alert_search_response';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('../../lib/kibana', () => {
  const originalModule = jest.requireActual('../../lib/kibana');
  return {
    ...originalModule,
    useUiSetting$: () => ['0,0.[000]'],
  };
});

jest.mock('../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));

const defaultProps: Props = {
  addFilter: jest.fn(),
  alignHeader: 'flexStart',
  chartOptionsContextMenu: (queryId: string) => (
    <ChartContextMenu
      defaultStackByField={DEFAULT_STACK_BY_FIELD}
      defaultStackByField1={DEFAULT_STACK_BY_FIELD1}
      queryId={queryId}
      setStackBy={jest.fn()}
      setStackByField1={jest.fn()}
    />
  ),

  isPanelExpanded: true,
  filters: [
    {
      meta: {
        alias: null,
        negate: true,
        disabled: false,
        type: 'exists',
        key: 'kibana.alert.building_block_type',
        value: 'exists',
      },
      query: {
        exists: {
          field: 'kibana.alert.building_block_type',
        },
      },
    },
    {
      meta: {
        alias: null,
        negate: false,
        disabled: false,
        type: 'phrase',
        key: 'kibana.alert.workflow_status',
        params: {
          query: 'open',
        },
      },
      query: {
        term: {
          'kibana.alert.workflow_status': 'open',
        },
      },
    },
  ],
  query: {
    query: '',
    language: 'kuery',
  },
  riskSubAggregationField: 'signal.rule.risk_score',
  runtimeMappings: {
    test_via_alerts_table: {
      type: 'keyword',
      script: {
        source: 'emit("Hello World!");',
      },
    },
  },
  setIsPanelExpanded: jest.fn(),
  setStackByField0: jest.fn(),
  setStackByField1: jest.fn(),
  signalIndexName: '.alerts-security.alerts-default',
  stackByField0: 'kibana.alert.rule.name',
  stackByField1: 'host.name',
  title: <ChartSelect alertViewSelection="treemap" setAlertViewSelection={jest.fn()} />,
};

describe('AlertsTreemapPanel', () => {
  beforeEach(() => {
    jest.resetAllMocks();

    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.alerts, detailName: undefined },
    ]);

    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: false,
      data: mockAlertSearchResponse,
      setQuery: () => {},
      response: '',
      request: '',
      refetch: () => {},
    });
  });

  it('renders the panel', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByTestId('treemapPanel')).toBeInTheDocument());
  });

  it('renders the panel with a hidden overflow-x', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() =>
      expect(screen.getByTestId('treemapPanel')).toHaveStyleRule('overflow-x', 'hidden')
    );
  });

  it('renders the panel with an auto overflow-y to allow vertical scrolling when necessary', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() =>
      expect(screen.getByTestId('treemapPanel')).toHaveStyleRule('overflow-y', 'auto')
    );
  });

  it('renders the chart selector as a custom header title', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByTestId('chartSelect')).toBeInTheDocument());
  });

  it('renders field selection when `isPanelExpanded` is true', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByTestId('fieldSelection')).toBeInTheDocument());
  });

  it('does NOT render field selection when `isPanelExpanded` is false', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} isPanelExpanded={false} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.queryByTestId('fieldSelection')).toBeNull());
  });

  it('renders the progress bar when data is loading', async () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: true,
      data: mockAlertSearchResponse,
      setQuery: () => {},
      response: '',
      request: '',
      refetch: () => {},
    });

    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByTestId('progress')).toBeInTheDocument());
  });

  it('does NOT render the progress bar when data has loaded', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull());
  });

  it('renders the treemap when data is available and `isPanelExpanded` is true', async () => {
    jest.mock('../../../detections/containers/detection_engine/alerts/use_query', () => {
      return {
        useQueryAlerts: () => ({
          loading: true,
          data: mockAlertSearchResponse,
          setQuery: () => {},
          response: '',
          request: '',
          refetch: () => {},
        }),
      };
    });

    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() =>
      expect(screen.getByTestId('treemap').querySelector('.echChart')).toBeInTheDocument()
    );
  });
});
