/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { fieldsMapping as fieldTitleChartMapping } from '../../../network/components/kpi_network/unique_private_ips';
import {
  mockData,
  mockEnableChartsData,
  mockNoChartMappings,
  mockNarrowDateRange,
} from '../../../network/components/kpi_network/mock';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../mock';
import { State, createStore } from '../../store';
import { Provider as ReduxStoreProvider } from 'react-redux';
import {
  HostsKpiStrategyResponse,
  NetworkKpiStrategyResponse,
} from '../../../../common/search_strategy';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';
import * as module from '../../containers/query_toggle';

const from = '2019-06-15T06:00:00.000Z';
const to = '2019-06-18T06:00:00.000Z';

jest.mock('../charts/areachart', () => {
  return { AreaChart: () => <div className="areachart" /> };
});

jest.mock('../charts/barchart', () => {
  return { BarChart: () => <div className="barchart" /> };
});

const mockSetToggle = jest.fn();

jest
  .spyOn(module, 'useQueryToggle')
  .mockImplementation(() => ({ toggleStatus: true, setToggleStatus: mockSetToggle }));
const mockSetQuerySkip = jest.fn();
describe('Stat Items Component', () => {
  const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const testProps = {
    description: 'HOSTS',
    fields: [{ key: 'hosts', value: null, color: '#6092C0', icon: 'cross' }],
    from,
    id: 'statItems',
    key: 'mock-keys',
    loading: false,
    setQuerySkip: mockSetQuerySkip,
    to,
    narrowDateRange: mockNarrowDateRange,
  };
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe.each([
    [
      mount(
        <ThemeProvider theme={mockTheme}>
          <ReduxStoreProvider store={store}>
            <StatItemsComponent {...testProps} />
          </ReduxStoreProvider>
        </ThemeProvider>
      ),
    ],
    [
      mount(
        <ThemeProvider theme={mockTheme}>
          <ReduxStoreProvider store={store}>
            <StatItemsComponent areaChart={[]} barChart={[]} {...testProps} />
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

  const mockStatItemsData: StatItemsProps = {
    ...testProps,
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
  };

  let wrapper: ReactWrapper;
  describe('rendering kpis with charts', () => {
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
  describe('Toggle query', () => {
    test('toggleQuery updates toggleStatus', () => {
      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent {...mockStatItemsData} />
        </ReduxStoreProvider>
      );
      wrapper.find('[data-test-subj="query-toggle-stat"]').first().simulate('click');
      expect(mockSetToggle).toBeCalledWith(false);
      expect(mockSetQuerySkip).toBeCalledWith(true);
    });
    test('toggleStatus=true, render all', () => {
      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent {...mockStatItemsData} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toEqual(true);
      expect(wrapper.find('[data-test-subj="stat-title"]').first().exists()).toEqual(true);
    });
    test('toggleStatus=false, render none', () => {
      jest
        .spyOn(module, 'useQueryToggle')
        .mockImplementation(() => ({ toggleStatus: false, setToggleStatus: mockSetToggle }));
      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent {...mockStatItemsData} />
        </ReduxStoreProvider>
      );

      expect(wrapper.find('[data-test-subj="inspect-icon-button"]').first().exists()).toEqual(
        false
      );
      expect(wrapper.find('[data-test-subj="stat-title"]').first().exists()).toEqual(false);
    });
  });
});

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

describe('useKpiMatrixStatus', () => {
  const mockNetworkMappings = fieldTitleChartMapping;
  const MockChildComponent = (mappedStatItemProps: StatItemsProps) => <span />;
  const MockHookWrapperComponent = ({
    fieldsMapping,
    data,
  }: {
    fieldsMapping: Readonly<StatItems[]>;
    data: NetworkKpiStrategyResponse | HostsKpiStrategyResponse;
  }) => {
    const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
      fieldsMapping,
      data,
      'statItem',
      from,
      to,
      mockNarrowDateRange,
      mockSetQuerySkip,
      false
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
        <MockHookWrapperComponent fieldsMapping={mockNetworkMappings} data={mockData} />
      </>
    );
    const result = { ...wrapper.find('MockChildComponent').get(0).props };
    const { setQuerySkip, ...restResult } = result;
    const { setQuerySkip: a, ...restExpect } = mockEnableChartsData;
    expect(restResult).toEqual(restExpect);
  });

  test('it should not append areaChart if enableAreaChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} data={mockData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.areaChart).toBeUndefined();
  });

  test('it should not append barChart if enableBarChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} data={mockData} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.barChart).toBeUndefined();
  });
});
