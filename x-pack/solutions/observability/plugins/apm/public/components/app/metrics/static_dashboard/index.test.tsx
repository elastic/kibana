/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import type { DashboardCreationOptions } from '@kbn/dashboard-plugin/public';
import { OPTIONS_LIST_CONTROL } from '@kbn/controls-constants';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { DEFAULT_DSL_OPTIONS_LIST_STATE } from '@kbn/controls-constants';
import type { CombinedFilter, ExistsFilter, Filter, PhraseFilter } from '@kbn/es-query';
import {
  BooleanRelation,
  getPhraseFilterField,
  getPhraseFilterValue,
  isCombinedFilter,
} from '@kbn/es-query';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../common/environment_filter_values';
import {
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/es_fields/apm';
import type { ApmPluginContextValue } from '../../../../context/apm_plugin/apm_plugin_context';
import {
  MockApmPluginContextWrapper,
  mockApmPluginContextValue,
} from '../../../../context/apm_plugin/mock_apm_plugin_context';
import * as useApmServiceContext from '../../../../context/apm_service/use_apm_service_context';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { fromQuery } from '../../../shared/links/url_helpers';
import { JsonMetricsDashboard, getFilters } from '.';
import * as helper from './helper';

let capturedGetCreationOptions: (() => Promise<DashboardCreationOptions>) | undefined;

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: (props: { getCreationOptions: () => Promise<DashboardCreationOptions> }) => {
    capturedGetCreationOptions = props.getCreationOptions;
    return <div data-test-subj="dashboardRenderer" />;
  },
}));

const KibanaReactContext = createKibanaReactContext({
  settings: { client: { get: () => {} } },
} as unknown as Partial<CoreStart>);

const mockDataView = {
  id: 'test-data-view-id',
  name: 'apm-data-view',
  getIndexPattern: () => 'metrics-*',
} as unknown as DataView;

const mockPanels = [{ type: 'lens', grid: { x: 0, y: 0, w: 24, h: 12 }, uid: '1', config: {} }];

function renderDashboard() {
  jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
    agentName: 'java',
    serviceName: 'test-service',
    transactionTypeStatus: FETCH_STATUS.SUCCESS,
    transactionTypes: [],
    fallbackToTransactions: false,
    serviceAgentStatus: FETCH_STATUS.SUCCESS,
  });

  const history = createMemoryHistory();
  history.replace({
    pathname: '/services/test-service/metrics',
    search: fromQuery({ rangeFrom: 'now-15m', rangeTo: 'now' }),
  });

  return render(
    <KibanaReactContext.Provider>
      <MockApmPluginContextWrapper
        history={history}
        value={mockApmPluginContextValue as unknown as ApmPluginContextValue}
      >
        <JsonMetricsDashboard agentName="java" dataView={mockDataView} />
      </MockApmPluginContextWrapper>
    </KibanaReactContext.Provider>
  );
}

describe('JsonMetricsDashboard', () => {
  beforeEach(() => {
    capturedGetCreationOptions = undefined;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('getCreationOptions', () => {
    it('returns useControlsIntegration: true', async () => {
      jest.spyOn(helper, 'convertSavedDashboardToPanels').mockResolvedValue(mockPanels as any);
      renderDashboard();

      expect(capturedGetCreationOptions).toBeDefined();
      const options = await capturedGetCreationOptions!();

      expect(options.useControlsIntegration).toBe(true);
    });

    it('returns pinned_panels with an options list control for service.node.name', async () => {
      jest.spyOn(helper, 'convertSavedDashboardToPanels').mockResolvedValue(mockPanels as any);
      renderDashboard();

      expect(capturedGetCreationOptions).toBeDefined();
      const options = await capturedGetCreationOptions!();
      const input = options.getInitialInput!();

      expect(input.pinned_panels).toEqual([
        {
          type: OPTIONS_LIST_CONTROL,
          config: {
            ...DEFAULT_DSL_OPTIONS_LIST_STATE,
            data_view_id: 'test-data-view-id',
            title: 'Node name',
            field_name: 'service.node.name',
          },
          width: 'medium',
          grow: true,
        },
      ]);
    });

    it('passes panels from convertSavedDashboardToPanels in getInitialInput', async () => {
      jest.spyOn(helper, 'convertSavedDashboardToPanels').mockResolvedValue(mockPanels as any);
      renderDashboard();

      const options = await capturedGetCreationOptions!();
      const input = options.getInitialInput!();

      expect(input.panels).toBe(mockPanels);
      expect(input.viewMode).toBe('view');
    });

    it('shows a danger toast and returns empty options when panels fail to load', async () => {
      jest.spyOn(helper, 'convertSavedDashboardToPanels').mockResolvedValue(undefined);
      renderDashboard();

      const options = await capturedGetCreationOptions!();

      expect(options).toEqual({});
      expect(mockApmPluginContextValue.core.notifications.toasts.addDanger).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Failed parsing dashboard panels.',
        })
      );
    });

    it('uses empty string for data_view_id when dataView.id is undefined', async () => {
      jest.spyOn(helper, 'convertSavedDashboardToPanels').mockResolvedValue(mockPanels as any);

      jest.spyOn(useApmServiceContext, 'useApmServiceContext').mockReturnValue({
        agentName: 'java',
        serviceName: 'test-service',
        transactionTypeStatus: FETCH_STATUS.SUCCESS,
        transactionTypes: [],
        fallbackToTransactions: false,
        serviceAgentStatus: FETCH_STATUS.SUCCESS,
      });

      const history = createMemoryHistory();
      history.replace({
        pathname: '/services/test-service/metrics',
        search: fromQuery({ rangeFrom: 'now-15m', rangeTo: 'now' }),
      });

      const dataViewWithNoId = {
        name: 'apm-data-view',
        getIndexPattern: () => 'metrics-*',
      } as unknown as DataView;

      render(
        <KibanaReactContext.Provider>
          <MockApmPluginContextWrapper
            history={history}
            value={mockApmPluginContextValue as unknown as ApmPluginContextValue}
          >
            <JsonMetricsDashboard agentName="java" dataView={dataViewWithNoId} />
          </MockApmPluginContextWrapper>
        </KibanaReactContext.Provider>
      );

      const options = await capturedGetCreationOptions!();
      const input = options.getInitialInput!();
      const config = input.pinned_panels![0].config as { data_view_id: string };

      expect(config.data_view_id).toBe('');
    });
  });
});

describe('getFilters', () => {
  const createField = (name: string) => ({ name, type: 'string' }) as unknown as DataViewField;

  function createDataView(fieldNames: string[]) {
    const fields = new Map(fieldNames.map((name) => [name, createField(name)]));
    return {
      id: 'test-data-view-id',
      getFieldByName: (name: string) => fields.get(name),
    } as unknown as DataView;
  }

  const dataView = createDataView([
    SERVICE_NAME,
    SERVICE_ENVIRONMENT,
    RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  ]);

  const phrases = (filter: Filter): Array<Record<string, string>> =>
    isCombinedFilter(filter)
      ? filter.meta.params.flatMap(phrases)
      : [
          {
            [getPhraseFilterField(filter as PhraseFilter)]: getPhraseFilterValue(
              filter as PhraseFilter
            ) as string,
          },
        ];

  it('only filters by service name for ENVIRONMENT_ALL', () => {
    const filters = getFilters('my-service', ENVIRONMENT_ALL.value, dataView);
    expect(filters.map(phrases)).toEqual([[{ [SERVICE_NAME]: 'my-service' }]]);
  });

  it('matches either service.environment or deployment.environment.name for a specific environment', () => {
    const [, environmentFilter] = getFilters('my-service', 'production', dataView);

    expect(isCombinedFilter(environmentFilter)).toBe(true);
    expect((environmentFilter as CombinedFilter).meta.relation).toBe(BooleanRelation.OR);
    expect(phrases(environmentFilter)).toEqual([
      { [SERVICE_ENVIRONMENT]: 'production' },
      { [RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME]: 'production' },
    ]);
  });

  it('falls back to a plain phrase filter when only service.environment is in the data view', () => {
    const [, environmentFilter] = getFilters(
      'my-service',
      'production',
      createDataView([SERVICE_NAME, SERVICE_ENVIRONMENT])
    );

    expect(isCombinedFilter(environmentFilter)).toBe(false);
    expect(phrases(environmentFilter)).toEqual([{ [SERVICE_ENVIRONMENT]: 'production' }]);
  });

  it('requires both fields to be missing for ENVIRONMENT_NOT_DEFINED', () => {
    const [, ...environmentFilters] = getFilters(
      'my-service',
      ENVIRONMENT_NOT_DEFINED.value,
      dataView
    );

    expect(
      environmentFilters.map((filter) => [
        (filter as ExistsFilter).query.exists?.field,
        filter.meta.negate,
      ])
    ).toEqual([
      [SERVICE_ENVIRONMENT, true],
      [RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME, true],
    ]);
  });

  it('adds no environment filter when no environment field is in the data view', () => {
    const filters = getFilters('my-service', 'production', createDataView([SERVICE_NAME]));
    expect(filters).toHaveLength(1);
  });
});
