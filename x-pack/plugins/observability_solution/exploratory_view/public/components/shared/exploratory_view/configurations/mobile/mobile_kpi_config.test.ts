/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReportTypes } from '../../../../..';
import { DataViewState } from '../../hooks/use_app_data_view';
import { getLayerConfigs } from '../../hooks/use_lens_attributes';
import { obsvReportConfigMap } from '../../obsv_exploratory_view';
import { mockAppDataView, mockDataView } from '../../rtl_helpers';
import { METRIC_SYSTEM_MEMORY_USAGE, SERVICE_NAME } from '../constants/elasticsearch_fieldnames';
import { LensAttributes } from '../lens_attributes';
import { testMobileKPIAttr } from '../test_data/mobile_test_attribute';

describe('Mobile kpi config test', function () {
  mockAppDataView();

  let lnsAttr: LensAttributes;

  const layerConfigs = getLayerConfigs(
    [
      {
        time: { from: 'now-15m', to: 'now' },
        reportDefinitions: { [SERVICE_NAME]: ['ios-integration-testing'] },
        selectedMetricField: METRIC_SYSTEM_MEMORY_USAGE,
        color: 'green',
        name: 'test-series',
        dataType: 'mobile',
      },
    ],
    ReportTypes.KPI,
    {} as any,
    { mobile: mockDataView } as DataViewState,
    obsvReportConfigMap
  );

  beforeEach(() => {
    lnsAttr = new LensAttributes(layerConfigs, ReportTypes.KPI);
  });
  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(testMobileKPIAttr);
  });
});
