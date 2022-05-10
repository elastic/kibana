/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NetworkKpiStrategyResponse } from '../../../../common/search_strategy';
import { StatItems } from '../../../common/components/stat_items';
import { kpiUniquePrivateIpsAreaLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_area';
import { kpiUniquePrivateIpsBarLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_bar';
import { kpiUniquePrivateIpsDestinationMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_destination_metric';
import { kpiUniquePrivateIpsSourceMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/network/kpi_unique_private_ips_source_metric';

export const mockNarrowDateRange = jest.fn();

export const mockData: NetworkKpiStrategyResponse = {
  networkEvents: 16,
  uniqueFlowId: 10277307,
  uniqueSourcePrivateIps: 383,
  uniqueSourcePrivateIpsHistogram: [
    {
      x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
      y: 8,
    },
    {
      x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
      y: 0,
    },
  ],
  uniqueDestinationPrivateIps: 18,
  uniqueDestinationPrivateIpsHistogram: [
    {
      x: new Date('2019-02-09T16:00:00.000Z').valueOf(),
      y: 8,
    },
    {
      x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
      y: 0,
    },
  ],
  dnsQueries: 278,
  tlsHandshakes: 10000,
};

const mockMappingItems: StatItems = {
  key: 'UniqueIps',
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: null,
      name: 'Src.',
      description: 'source',
      color: '#D36086',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: null,
      name: 'Dest.',
      description: 'destination',
      color: '#9170B8',
      icon: 'visMapCoordinate',
    },
  ],
  description: 'Unique private IPs',
  enableAreaChart: true,
  enableBarChart: true,
};

export const mockNoChartMappings: Readonly<StatItems[]> = [
  {
    ...mockMappingItems,
    enableAreaChart: false,
    enableBarChart: false,
  },
];

export const mockDisableChartsInitialData = {
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: undefined,
      name: 'Src.',
      description: 'source',
      color: '#D36086',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: undefined,
      name: 'Dest.',
      description: 'destination',
      color: '#9170B8',
      icon: 'visMapCoordinate',
    },
  ],
  description: 'Unique private IPs',
  enableAreaChart: false,
  enableBarChart: false,
  areaChart: undefined,
  barChart: undefined,
};

export const mockEnableChartsInitialData = {
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: undefined,
      name: 'Src.',
      description: 'source',
      color: '#D36086',
      icon: 'visMapCoordinate',
      lensAttributes: kpiUniquePrivateIpsSourceMetricLensAttributes,
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: undefined,
      name: 'Dest.',
      description: 'destination',
      color: '#9170B8',
      icon: 'visMapCoordinate',
      lensAttributes: kpiUniquePrivateIpsDestinationMetricLensAttributes,
    },
  ],
  description: 'Unique private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  areaChartLensAttributes: kpiUniquePrivateIpsAreaLensAttributes,
  barChartLensAttributes: kpiUniquePrivateIpsBarLensAttributes,
  areaChart: [],
  barChart: [
    {
      color: '#D36086',
      key: 'uniqueSourcePrivateIps',
      value: [
        {
          g: 'uniqueSourcePrivateIps',
          x: 'Src.',
          y: null,
        },
      ],
    },
    {
      color: '#9170B8',
      key: 'uniqueDestinationPrivateIps',
      value: [
        {
          g: 'uniqueDestinationPrivateIps',
          x: 'Dest.',
          y: null,
        },
      ],
    },
  ],
};

export const mockEnableChartsData = {
  areaChart: [
    {
      key: 'uniqueSourcePrivateIpsHistogram',
      value: [
        { x: new Date('2019-02-09T16:00:00.000Z').valueOf(), y: 8 },
        {
          x: new Date('2019-02-09T19:00:00.000Z').valueOf(),
          y: 0,
        },
      ],
      name: 'Src.',
      description: 'source',
      color: '#D36086',
      icon: 'visMapCoordinate',
    },
    {
      key: 'uniqueDestinationPrivateIpsHistogram',
      value: [
        { x: new Date('2019-02-09T16:00:00.000Z').valueOf(), y: 8 },
        { x: new Date('2019-02-09T19:00:00.000Z').valueOf(), y: 0 },
      ],
      name: 'Dest.',
      description: 'destination',
      color: '#9170B8',
      icon: 'visMapCoordinate',
    },
  ],
  barChart: [
    {
      key: 'uniqueSourcePrivateIps',
      color: '#D36086',
      value: [
        {
          x: 'Src.',
          y: 383,
          g: 'uniqueSourcePrivateIps',
          y0: 0,
        },
      ],
    },
    {
      key: 'uniqueDestinationPrivateIps',
      color: '#9170B8',
      value: [{ x: 'Dest.', y: 18, g: 'uniqueDestinationPrivateIps', y0: 0 }],
    },
  ],
  description: 'Unique private IPs',
  enableAreaChart: true,
  enableBarChart: true,
  fields: [
    {
      key: 'uniqueSourcePrivateIps',
      value: 383,
      name: 'Src.',
      description: 'source',
      color: '#D36086',
      icon: 'visMapCoordinate',
      lensAttributes: kpiUniquePrivateIpsSourceMetricLensAttributes,
    },
    {
      key: 'uniqueDestinationPrivateIps',
      value: 18,
      name: 'Dest.',
      description: 'destination',
      color: '#9170B8',
      icon: 'visMapCoordinate',
      lensAttributes: kpiUniquePrivateIpsDestinationMetricLensAttributes,
    },
  ],
  from: '2019-06-15T06:00:00.000Z',
  id: 'statItem',
  loading: false,
  statKey: 'UniqueIps',
  setQuerySkip: jest.fn(),
  to: '2019-06-18T06:00:00.000Z',
  narrowDateRange: mockNarrowDateRange,
  areaChartLensAttributes: kpiUniquePrivateIpsAreaLensAttributes,
  barChartLensAttributes: kpiUniquePrivateIpsBarLensAttributes,
};
