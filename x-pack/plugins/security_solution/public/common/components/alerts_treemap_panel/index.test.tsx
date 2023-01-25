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
import { useGlobalTime } from '../../containers/use_global_time';
import {
  DEFAULT_STACK_BY_FIELD,
  DEFAULT_STACK_BY_FIELD1,
} from '../../../detections/components/alerts_kpis/common/config';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ChartContextMenu } from '../../../detections/pages/detection_engine/chart_panels/chart_context_menu';
import { ChartSelect } from '../../../detections/pages/detection_engine/chart_panels/chart_select';
import { TREEMAP } from '../../../detections/pages/detection_engine/chart_panels/chart_select/translations';
import { TestProviders } from '../../mock/test_providers';
import type { Props } from '.';
import { AlertsTreemapPanel } from '.';
import { mockAlertSearchResponse } from '../alerts_treemap/lib/mocks/mock_alert_search_response';
import { useIsExperimentalFeatureEnabled } from '../../hooks/use_experimental_features';

const from = '2022-07-28T08:20:18.966Z';
const to = '2022-07-28T08:20:18.966Z';
jest.mock('../../containers/use_global_time', () => {
  const actual = jest.requireActual('../../containers/use_global_time');
  return {
    ...actual,
    useGlobalTime: jest
      .fn()
      .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() }),
  };
});

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

jest.mock('../../hooks/use_experimental_features');
jest.mock('../page/use_refetch_by_session');
jest.mock('../visualization_actions/lens_embeddable');

jest.mock('../../../detections/components/alerts_kpis/common/hooks', () => ({
  useInspectButton: jest.fn(),
  useStackByFields: jest.fn(),
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
  inspectTitle: TREEMAP,
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
    jest.clearAllMocks();

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

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(false);
  });

  it('renders the panel', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByTestId('treemapPanel')).toBeInTheDocument());
  });

  it('invokes useGlobalTime() with false to prevent global queries from being deleted when the component unmounts', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(useGlobalTime).toBeCalledWith(false));
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

  it('renders the panel with the expected class to style the overflow-y scroll bar', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.getByTestId('treemapPanel')).toHaveClass('eui-yScroll'));
  });

  it('renders the panel with an auto overflow-y to allow vertical scrolling when necessary when the panel is expanded', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() =>
      expect(screen.getByTestId('treemapPanel')).toHaveStyleRule('overflow-y', 'auto')
    );
  });

  it('renders the panel with a hidden overflow-y when the panel is NOT expanded', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} isPanelExpanded={false} />
      </TestProviders>
    );

    await waitFor(() =>
      expect(screen.getByTestId('treemapPanel')).toHaveStyleRule('overflow-y', 'hidden')
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

    await waitFor(() => expect(screen.queryByTestId('fieldSelection')).not.toBeInTheDocument());
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

  it('does NOT render the progress bar when loading is true, but the panel is collapsed', async () => {
    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: true, // <-- true when users click the page-level Refresh button
      data: mockAlertSearchResponse,
      setQuery: () => {},
      response: '',
      request: '',
      refetch: () => {},
    });

    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} isPanelExpanded={false} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.queryByTestId('progress')).not.toBeInTheDocument());
  });

  it('does NOT render the progress bar when data has loaded', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    await waitFor(() => expect(screen.queryByTestId('progress')).not.toBeInTheDocument());
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

    await waitFor(() => expect(screen.getByTestId('treemap')).toBeInTheDocument());
  });
});

describe('when isChartEmbeddablesEnabled = true', () => {
  const mockRefetch = () => {};

  beforeEach(() => {
    jest.clearAllMocks();

    (useLocation as jest.Mock).mockReturnValue([
      { pageName: SecurityPageName.alerts, detailName: undefined },
    ]);

    (useQueryAlerts as jest.Mock).mockReturnValue({
      loading: false,
      data: mockAlertSearchResponse,
      setQuery: () => {},
      response: '',
      request: '',
      refetch: mockRefetch,
    });

    (useIsExperimentalFeatureEnabled as jest.Mock).mockReturnValue(true);
  });

  it('renders LensEmbeddable', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    expect(screen.getByTestId('lens-embeddable')).toBeInTheDocument();
  });

  it('should skip calling getAlertsRiskQuery', async () => {
    render(
      <TestProviders>
        <AlertsTreemapPanel {...defaultProps} />
      </TestProviders>
    );

    expect(useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: true,
      })
    );
  });
});
