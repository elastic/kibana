/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { allSeriesKey, reportTypeKey, UrlStorageContextProvider } from './use_series_storage';
import { renderHook } from '@testing-library/react-hooks';
import { useLensAttributes } from './use_lens_attributes';
import { ReportTypes } from '../configurations/constants';
import { mockDataView } from '../rtl_helpers';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { TRANSACTION_DURATION } from '../configurations/constants/elasticsearch_fieldnames';
import * as lensAttributes from '../configurations/lens_attributes';
import * as useAppDataViewHook from './use_app_data_view';
import * as theme from '../../../../hooks/use_theme';
import { dataTypes, obsvReportConfigMap, reportTypesList } from '../obsv_exploratory_view';
import { ExploratoryViewContextProvider } from '../contexts/exploratory_view_config';
import { themeServiceMock } from '@kbn/core/public/mocks';
import * as lensHook from './use_lens_formula_helper';
import { lensPluginMock } from '@kbn/lens-plugin/public/mocks';
import { FormulaPublicApi } from '@kbn/lens-plugin/public';

const mockSingleSeries = [
  {
    name: 'performance-distribution',
    dataType: 'ux',
    breakdown: 'user_agent.name',
    time: { from: 'now-15m', to: 'now' },
    selectedMetricField: TRANSACTION_DURATION,
    reportDefinitions: { 'service.name': ['elastic-co'] },
  },
];

describe('useExpViewTimeRange', function () {
  const storage = createKbnUrlStateStorage({ useHash: false });
  // @ts-ignore
  jest.spyOn(useAppDataViewHook, 'useAppDataViewContext').mockReturnValue({
    dataViews: {
      ux: mockDataView,
      apm: mockDataView,
      mobile: mockDataView,
      infra_logs: mockDataView,
      infra_metrics: mockDataView,
      synthetics: mockDataView,
      alerts: mockDataView,
    },
  });
  jest.spyOn(theme, 'useTheme').mockReturnValue({
    // @ts-ignore
    eui: {
      euiColorVis1: '#111111',
    },
  });

  let formulaHelper: FormulaPublicApi;

  beforeAll(async () => {
    const lensPluginMockStart = lensPluginMock.createStartContract();
    formulaHelper = (await lensPluginMockStart.stateHelperApi()).formula;

    jest.spyOn(lensHook, 'useLensFormulaHelper').mockReturnValue(formulaHelper);
  });

  const lensAttributesSpy = jest.spyOn(lensAttributes, 'LensAttributes');

  function Wrapper({ children }: { children: JSX.Element }) {
    return (
      <ExploratoryViewContextProvider
        reportTypes={reportTypesList}
        dataTypes={dataTypes}
        reportConfigMap={obsvReportConfigMap}
        setHeaderActionMenu={jest.fn()}
        theme$={themeServiceMock.createTheme$()}
      >
        <UrlStorageContextProvider storage={storage}>{children}</UrlStorageContextProvider>
      </ExploratoryViewContextProvider>
    );
  }

  it('updates lens attributes with report type from storage', async function () {
    await storage.set(allSeriesKey, mockSingleSeries);
    await storage.set(reportTypeKey, ReportTypes.KPI);

    renderHook(() => useLensAttributes(), {
      wrapper: Wrapper,
    });

    expect(lensAttributesSpy).toBeCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          seriesConfig: expect.objectContaining({ reportType: ReportTypes.KPI }),
        }),
      ]),
      'kpi-over-time',
      formulaHelper
    );
  });
});
