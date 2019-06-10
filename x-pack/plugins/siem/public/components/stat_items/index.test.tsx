/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, ReactWrapper } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import {
  StatItemsComponent,
  StatItemsProps,
  addValueToFields,
  addValueToAreaChart,
  addValueToBarChart,
} from '.';
import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { EuiHorizontalRule } from '@elastic/eui';
import { fieldTitleChartMapping, KpiNetworkBaseComponent } from '../page/network/kpi_network';
import {
  mockData,
  mockNoChartMappings,
  mockDisableChartsInitialData,
  mockEnableChartsData,
  mockEnableChartsInitialData,
} from '../page/network/kpi_network/mock';

describe('Stat Items Component', () => {
  describe.each([
    [
      mount(
        <StatItemsComponent
          fields={[{ key: 'hosts', value: null, color: '#3185FC', icon: 'cross' }]}
          description="HOSTS"
          key="mock-keys"
        />
      ),
    ],
    [
      mount(
        <StatItemsComponent
          fields={[{ key: 'hosts', value: null, color: '#3185FC', icon: 'cross' }]}
          description="HOSTS"
          areaChart={[]}
          barChart={[]}
          key="mock-keys"
        />
      ),
    ],
  ])('disable charts', wrapper => {
    test('it renders the default widget', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should render titles', () => {
      expect(wrapper.find('[data-test-subj="stat-title"]')).toBeTruthy();
    });

    test('should not render icons', () => {
      expect(wrapper.find('[data-test-subj="stat-icon"]').filter('EuiIcon')).toHaveLength(0);
    });

    test('should not render barChart', () => {
      expect(wrapper.find(BarChart)).toHaveLength(0);
    });

    test('should not render areaChart', () => {
      expect(wrapper.find(AreaChart)).toHaveLength(0);
    });

    test('should not render spliter', () => {
      expect(wrapper.find(EuiHorizontalRule)).toHaveLength(0);
    });
  });

  describe('rendering kpis with charts', () => {
    const mockStatItemsData: StatItemsProps = {
      fields: [
        {
          key: 'uniqueSourceIps',
          description: 'Source',
          value: 1714,
          color: '#DB1374',
          icon: 'cross',
        },
        {
          key: 'uniqueDestinationIps',
          description: 'Dest.',
          value: 2359,
          color: '#490092',
          icon: 'cross',
        },
      ],
      enableAreaChart: true,
      enableBarChart: true,
      areaChart: [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: 1556686800000, y: 580213 },
            { x: 1556730000000, y: 1096175 },
            { x: 1556773200000, y: 12382 },
          ],
          color: '#DB1374',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: 1556686800000, y: 565975 },
            { x: 1556730000000, y: 1084366 },
            { x: 1556773200000, y: 12280 },
          ],
          color: '#490092',
        },
      ],
      barChart: [
        { key: 'uniqueSourceIps', value: [{ x: 'uniqueSourceIps', y: '1714' }], color: '#DB1374' },
        {
          key: 'uniqueDestinationIps',
          value: [{ x: 'uniqueDestinationIps', y: 2354 }],
          color: '#490092',
        },
      ],
      description: 'UNIQUE_PRIVATE_IPS',
      key: 'mock-keys',
    };
    let wrapper: ReactWrapper;
    beforeAll(() => {
      wrapper = mount(<StatItemsComponent {...mockStatItemsData} />);
    });
    test('it renders the default widget', () => {
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('should handle multiple titles', () => {
      expect(wrapper.find('[data-test-subj="stat-title"]')).toHaveLength(2);
    });

    test('should render kpi icons', () => {
      expect(wrapper.find('[data-test-subj="stat-icon"]').filter('EuiIcon')).toHaveLength(2);
    });

    test('should render barChart', () => {
      expect(wrapper.find(BarChart)).toHaveLength(1);
    });

    test('should render areaChart', () => {
      expect(wrapper.find(AreaChart)).toHaveLength(1);
    });

    test('should render separator', () => {
      expect(wrapper.find(EuiHorizontalRule)).toHaveLength(1);
    });
  });
});

describe('addValueToFields', () => {
  const mockNetworkMappings = fieldTitleChartMapping[0];
  const mockKpiNetworkData = mockData.KpiNetwork;
  test('should update value from data', () => {
    const result = addValueToFields(mockNetworkMappings.fields, mockKpiNetworkData);
    expect(result).toEqual(mockEnableChartsData.fields);
  });
});

describe('addValueToAreaChart', () => {
  const mockNetworkMappings = fieldTitleChartMapping[0];
  const mockKpiNetworkData = mockData.KpiNetwork;
  test('should add areaChart from data', () => {
    const result = addValueToAreaChart(mockNetworkMappings.fields, mockKpiNetworkData);
    expect(result).toEqual(mockEnableChartsData.areaChart);
  });
});

describe('addValueToBarChart', () => {
  const mockNetworkMappings = fieldTitleChartMapping[0];
  const mockKpiNetworkData = mockData.KpiNetwork;
  test('should add areaChart from data', () => {
    const result = addValueToBarChart(mockNetworkMappings.fields, mockKpiNetworkData);
    expect(result).toEqual(mockEnableChartsData.barChart);
  });
});

describe('useKpiMatrixStatus', () => {
  const mockNetworkMappings = fieldTitleChartMapping;
  const mockKpiNetworkData = mockData.KpiNetwork;

  test('it updates status correctly', () => {
    const wrapper = mount(
      <KpiNetworkBaseComponent fieldsMapping={mockNetworkMappings} data={{}} />
    );
    expect(wrapper.find(StatItemsComponent).get(0).props).toEqual(mockEnableChartsInitialData);
    wrapper.setProps({ data: mockKpiNetworkData });
    wrapper.update();

    expect(wrapper.find(StatItemsComponent).get(0).props).toEqual(mockEnableChartsData);
  });

  test('it should not append areaChart if enableAreaChart is off', () => {
    const mockNetworkMappingsNoAreaChart = mockNoChartMappings;

    const wrapper = mount(
      <KpiNetworkBaseComponent fieldsMapping={mockNetworkMappingsNoAreaChart} data={{}} />
    );
    expect(wrapper.find(StatItemsComponent).get(0).props).toEqual(mockDisableChartsInitialData);
    wrapper.setProps({ data: mockKpiNetworkData });
    wrapper.update();

    expect(wrapper.find(StatItemsComponent).get(0).props.areaChart).toBeUndefined();
  });

  test('it should not append barChart if enableBarChart is off', () => {
    const mockNetworkMappingsNoAreaChart = mockNoChartMappings;

    const wrapper = mount(
      <KpiNetworkBaseComponent fieldsMapping={mockNetworkMappingsNoAreaChart} data={{}} />
    );
    expect(wrapper.find(StatItemsComponent).get(0).props).toEqual(mockDisableChartsInitialData);
    wrapper.setProps({ data: mockKpiNetworkData });
    wrapper.update();

    expect(wrapper.find(StatItemsComponent).get(0).props.barChart).toBeUndefined();
  });
});
