/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockAppIndexPattern, mockIndexPattern } from '../../rtl_helpers';
import { getDefaultConfigs } from '../default_configs';
import { LayerConfig, LensAttributes } from '../lens_attributes';
import { sampleAttributeCoreWebVital } from '../test_data/sample_attribute_cwv';
import { LCP_FIELD, SERVICE_NAME, USER_AGENT_OS } from '../constants/elasticsearch_fieldnames';

describe('Core web vital config test', function () {
  mockAppIndexPattern();

  const seriesConfig = getDefaultConfigs({
    reportType: 'core-web-vitals',
    dataType: 'ux',
    indexPattern: mockIndexPattern,
  });

  let lnsAttr: LensAttributes;

  const layerConfig: LayerConfig = {
    seriesConfig,
    color: 'green',
    name: 'test-series',
    breakdown: USER_AGENT_OS,
    indexPattern: mockIndexPattern,
    time: { from: 'now-15m', to: 'now' },
    reportDefinitions: { [SERVICE_NAME]: ['elastic-co'] },
    selectedMetricField: LCP_FIELD,
  };

  beforeEach(() => {
    lnsAttr = new LensAttributes([layerConfig]);
  });
  it('should return expected json', function () {
    expect(lnsAttr.getJSON()).toEqual(sampleAttributeCoreWebVital);
  });
});
