/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addValueToFields, addValueToAreaChart, addValueToBarChart } from './utils';
import { fieldsMapping as fieldTitleChartMapping } from '../../network/components/kpi_network/unique_private_ips';

import { mockData, mockEnableChartsData } from '../../network/components/kpi_network/mock';

describe('addValueToFields', () => {
  const mockNetworkMappings = fieldTitleChartMapping[0];
  test('should update value from data', () => {
    const result = addValueToFields(mockNetworkMappings.fields, mockData);
    expect(result).toEqual(mockEnableChartsData.fields);
  });
});

describe('addValueToAreaChart', () => {
  const mockNetworkMappings = fieldTitleChartMapping[0];
  test('should add areaChart from data', () => {
    const result = addValueToAreaChart(mockNetworkMappings.fields, mockData);
    expect(result).toEqual(mockEnableChartsData.areaChart);
  });
});

describe('addValueToBarChart', () => {
  const mockNetworkMappings = fieldTitleChartMapping[0];
  test('should add areaChart from data', () => {
    const result = addValueToBarChart(mockNetworkMappings.fields, mockData);
    expect(result).toEqual(mockEnableChartsData.barChart);
  });
});
