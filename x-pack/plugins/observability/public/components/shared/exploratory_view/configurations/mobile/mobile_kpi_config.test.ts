/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAppIndexPattern, mockIndexPattern } from '../../rtl_helpers';
import { LensAttributes } from '../lens_attributes';
import { METRIC_SYSTEM_MEMORY_USAGE, SERVICE_NAME } from '../constants/elasticsearch_fieldnames';
import { obsvReportConfigMap } from '../../obsv_exploratory_view';
import { testMobileKPIAttr } from '../test_data/mobile_test_attribute';
import { getLayerConfigs } from '../../hooks/use_lens_attributes';
import { IndexPatternState } from '../../hooks/use_app_index_pattern';

describe('Mobile kpi config test', function () {
  mockAppIndexPattern();

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
    'kpi-over-time',
    {} as any,
    { mobile: mockIndexPattern } as IndexPatternState,
    obsvReportConfigMap
  );

  beforeEach(() => {
    lnsAttr = new LensAttributes(layerConfigs);
  });
  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(testMobileKPIAttr);
  });
});
