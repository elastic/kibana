/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, ReactWrapper } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import {
  StatItemsComponent,
  StatItemsProps,
  addValueToFields,
  addValueToAreaChart,
  addValueToBarChart,
  useKpiMatrixStatus,
  StatItems,
} from '.';
import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { EuiHorizontalRule } from '@elastic/eui';
import { fieldTitleChartMapping } from '../../../network/components/kpi_network';
import {
  mockData,
  mockEnableChartsData,
  mockNoChartMappings,
  mockNarrowDateRange,
} from '../../../network/components/kpi_network/mock';
import {
  mockGlobalState,
  apolloClientObservable,
  SUB_PLUGINS_REDUCER,
  kibanaObservable,
  createSecuritySolutionStorageMock,
} from '../../mock';
import { State, createStore } from '../../store';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { KpiNetworkData, KpiHostsData } from '../../../graphql/types';

const from = '2019-06-15T06:00:00.000Z';
const to = '2019-06-18T06:00:00.000Z';

jest.mock('../charts/areachart', () => {
  return { AreaChart: () => <div className="areachart" /> };
});

jest.mock('../charts/barchart', () => {
  return { BarChart: () => <div className="barchart" /> };
});

describe('Stat Items Component', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    apolloClientObservable,
    kibanaObservable,
    storage
  );

  describe.each([
    [
      mount(
        <ThemeProvider theme={theme}>
          <ReduxStoreProvider store={store}>
            <StatItemsComponent
              description="HOSTS"
              fields={[{ key: 'hosts', value: null, color: '#6092C0', icon: 'cross' }]}
              from={from}
              id="statItems"
              index={0}
              key="mock-keys"
              to={to}
              narrowDateRange={mockNarrowDateRange}
            />
          </ReduxStoreProvider>
        </ThemeProvider>
      ),
    ],
    [
      mount(
        <ThemeProvider theme={theme}>
          <ReduxStoreProvider store={store}>
            <StatItemsComponent
              areaChart={[]}
              barChart={[]}
              description="HOSTS"
              fields={[{ key: 'hosts', value: null, color: '#6092C0', icon: 'cross' }]}
              from={from}
              id="statItems"
              index={0}
              key="mock-keys"
              to={to}
              narrowDateRange={mockNarrowDateRange}
            />
          </ReduxStoreProvider>
        </ThemeProvider>
      ),
    ],
  ])('disable charts', (wrapper) => {
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
      areaChart: [
        {
          key: 'uniqueSourceIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').toISOString(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').toISOString(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').toISOString(), y: 12280 },
          ],
          color: '#D36086',
        },
        {
          key: 'uniqueDestinationIpsHistogram',
          value: [
            { x: new Date('2019-05-03T13:00:00.000Z').toISOString(), y: 565975 },
            { x: new Date('2019-05-04T01:00:00.000Z').toISOString(), y: 1084366 },
            { x: new Date('2019-05-04T13:00:00.000Z').toISOString(), y: 12280 },
          ],
          color: '#9170B8',
        },
      ],
      barChart: [
        { key: 'uniqueSourceIps', value: [{ x: 'uniqueSourceIps', y: '1714' }], color: '#D36086' },
        {
          key: 'uniqueDestinationIps',
          value: [{ x: 'uniqueDestinationIps', y: 2354 }],
          color: '#9170B8',
        },
      ],
      description: 'UNIQUE_PRIVATE_IPS',
      enableAreaChart: true,
      enableBarChart: true,
      fields: [
        {
          key: 'uniqueSourceIps',
          description: 'Source',
          value: 1714,
          color: '#D36086',
          icon: 'cross',
        },
        {
          key: 'uniqueDestinationIps',
          description: 'Dest.',
          value: 2359,
          color: '#9170B8',
          icon: 'cross',
        },
      ],
      from,
      id: 'statItems',
      index: 0,
      key: 'mock-keys',
      to,
      narrowDateRange: mockNarrowDateRange,
    };
    let wrapper: ReactWrapper;
    beforeAll(() => {
      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent {...mockStatItemsData} />
        </ReduxStoreProvider>
      );
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
  const MockChildComponent = (mappedStatItemProps: StatItemsProps) => <span />;
  const MockHookWrapperComponent = ({
    fieldsMapping,
    data,
  }: {
    fieldsMapping: Readonly<StatItems[]>;
    data: KpiNetworkData | KpiHostsData;
  }) => {
    const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
      fieldsMapping,
      data,
      'statItem',
      from,
      to,
      mockNarrowDateRange
    );

    return (
      <div>
        {statItemsProps.map((mappedStatItemProps) => {
          return <MockChildComponent {...mappedStatItemProps} />;
        })}
      </div>
    );
  };

  test('it updates status correctly', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNetworkMappings} data={mockKpiNetworkData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props).toEqual(mockEnableChartsData);
  });

  test('it should not append areaChart if enableAreaChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} data={mockKpiNetworkData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.areaChart).toBeUndefined();
  });

  test('it should not append barChart if enableBarChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} data={mockKpiNetworkData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.barChart).toBeUndefined();
  });
});
