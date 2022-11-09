/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactWrapper } from 'enzyme';
import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import type { StatItemsProps } from '.';
import { StatItemsComponent } from './stat_items';
import { BarChart } from '../charts/barchart';
import { AreaChart } from '../charts/areachart';
import { EuiHorizontalRule } from '@elastic/eui';
import { mockUpdateDateRange } from '../../../network/components/kpi_network/mock';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
} from '../../mock';
import type { State } from '../../store';
import { createStore } from '../../store';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { getMockTheme } from '../../lib/kibana/kibana_react.mock';
import * as module from '../../containers/query_toggle';
import { tGridReducer } from '@kbn/timelines-plugin/public';
import type { LensAttributes } from '../visualization_actions/types';

const from = '2019-06-15T06:00:00.000Z';
const to = '2019-06-18T06:00:00.000Z';

jest.mock('../charts/areachart', () => {
  return { AreaChart: () => <div className="areachart" /> };
});

jest.mock('../charts/barchart', () => {
  return { BarChart: () => <div className="barchart" /> };
});

jest.mock('../visualization_actions', () => {
  return {
    VisualizationActions: () => <div className="visualizationActions" />,
    HISTOGRAM_ACTIONS_BUTTON_CLASS: 'histogram-actions-trigger',
  };
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
  const store = createStore(
    state,
    SUB_PLUGINS_REDUCER,
    { dataTable: tGridReducer },
    kibanaObservable,
    storage
  );
  const testProps = {
    description: 'HOSTS',
    fields: [{ key: 'hosts', value: null, color: '#6092C0', icon: 'cross' }],
    from,
    id: 'hostsKpiHostsQuery',
    key: 'mock-keys',
    loading: false,
    setQuerySkip: mockSetQuerySkip,
    to,
    updateDateRange: mockUpdateDateRange,
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
        lensAttributes: {} as LensAttributes,
      },
      {
        key: 'uniqueDestinationIps',
        description: 'Dest.',
        value: 2359,
        color: '#9170B8',
        icon: 'cross',
        lensAttributes: {} as LensAttributes,
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
      expect(wrapper.find('[data-test-subj="stat-title"]').find('p')).toHaveLength(2);
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

      expect(wrapper.find(`.viz-actions`).exists()).toEqual(true);
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

      expect(wrapper.find('.viz-actions').first().exists()).toEqual(false);
      expect(wrapper.find('[data-test-subj="stat-title"]').first().exists()).toEqual(false);
    });
  });
});
