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

import type { StatItemsProps, StatItems } from '.';
import { StatItemsComponent, useKpiMatrixStatus } from '.';
import { fieldsMapping as fieldTitleChartMapping } from '../../../network/components/kpi_network/unique_private_ips';
import {
  mockEmbeddablesData,
  mockNoChartMappings,
} from '../../../network/components/kpi_network/mock';
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
import type { LensAttributes } from '../visualization_actions/types';

const from = '2019-06-15T06:00:00.000Z';
const to = '2019-06-18T06:00:00.000Z';

const mockSetToggle = jest.fn();

jest.mock('../visualization_actions/lens_embeddable', () => {
  return { LensEmbeddable: () => <div /> };
});

jest
  .spyOn(module, 'useQueryToggle')
  .mockImplementation(() => ({ toggleStatus: true, setToggleStatus: mockSetToggle }));
describe('Stat Items Component', () => {
  const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });
  const state: State = mockGlobalState;
  const { storage } = createSecuritySolutionStorageMock();
  const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
  const testProps = {
    description: 'HOSTS',
    fields: [
      {
        key: 'hosts',
        value: null,
        color: '#6092C0',
        icon: 'cross',
        description: 'mock description',
      },
    ],
    from,
    id: 'statItems',
    key: 'mock-keys',
    loading: false,
    to,
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
            <StatItemsComponent {...testProps} />
          </ReduxStoreProvider>
        </ThemeProvider>
      ),
    ],
  ])('disable charts', (wrapper) => {
    test('should render titles', () => {
      expect(wrapper.find('[data-test-subj="stat-title"]')).toBeTruthy();
    });

    test('should not render barChart', () => {
      expect(wrapper.find('[data-test-subj="embeddable-bar-chart"]')).toHaveLength(0);
    });

    test('should not render areaChart', () => {
      expect(wrapper.find('[data-test-subj="embeddable-area-chart"]')).toHaveLength(0);
    });

    test('should not render spliter', () => {
      expect(wrapper.find('EuiHorizontalRule')).toHaveLength(0);
    });
  });

  const mockStatItemsData: StatItemsProps = {
    ...testProps,
    description: 'UNIQUE_PRIVATE_IPS',
    enableAreaChart: true,
    enableBarChart: true,
    barChartLensAttributes: {} as LensAttributes,
    areaChartLensAttributes: {} as LensAttributes,
    fields: [
      {
        key: 'uniqueSourceIps',
        description: 'Source',
        color: '#D36086',
        icon: 'cross',
        lensAttributes: {} as LensAttributes,
      },
      {
        key: 'uniqueDestinationIps',
        description: 'Dest.',
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

    test('should handle multiple metrics', () => {
      expect(wrapper.find('[data-test-subj="embeddable-metric"]')).toHaveLength(2);
    });

    test('should render kpi icons', () => {
      expect(wrapper.find('[data-test-subj="stat-icon"]').filter('EuiIcon')).toHaveLength(2);
    });

    test('should render barChart', () => {
      expect(wrapper.find('[data-test-subj="embeddable-bar-chart"]')).toHaveLength(1);
    });

    test('should render areaChart', () => {
      expect(wrapper.find('[data-test-subj="embeddable-area-chart"]')).toHaveLength(1);
    });

    test('should render separator', () => {
      expect(wrapper.find('EuiHorizontalRule')).toHaveLength(1);
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
    });
    test('toggleStatus=true, render all', () => {
      wrapper = mount(
        <ReduxStoreProvider store={store}>
          <StatItemsComponent {...mockStatItemsData} />
        </ReduxStoreProvider>
      );
      expect(wrapper.find('[data-test-subj="embeddable-metric"]')).toHaveLength(2);
      expect(wrapper.find('[data-test-subj="embeddable-bar-chart"]')).toHaveLength(1);
      expect(wrapper.find('[data-test-subj="embeddable-area-chart"]')).toHaveLength(1);
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

      expect(wrapper.find('[data-test-subj="embeddable-metric"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="embeddable-bar-chart"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="embeddable-area-chart"]').exists()).toBeFalsy();
    });
  });
});

describe('useKpiMatrixStatus', () => {
  const mockNetworkMappings = fieldTitleChartMapping;
  const MockChildComponent = () => <span />;
  const MockHookWrapperComponent = ({
    fieldsMapping,
  }: {
    fieldsMapping: Readonly<StatItems[]>;
  }) => {
    const statItemsProps: StatItemsProps[] = useKpiMatrixStatus(
      fieldsMapping,
      'statItem',
      from,
      to
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
        <MockHookWrapperComponent fieldsMapping={mockNetworkMappings} />
      </>
    );
    const result = { ...wrapper.find('MockChildComponent').get(0).props };
    const { setQuerySkip, ...restResult } = result;
    const { setQuerySkip: _, ...restExpect } = mockEmbeddablesData;
    expect(restResult).toEqual(restExpect);
  });

  test('it should not append areaChart if enableAreaChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.areaChart).toBeUndefined();
  });

  test('it should not append barChart if enableBarChart is off', () => {
    const wrapper = mount(
      <>
        <MockHookWrapperComponent fieldsMapping={mockNoChartMappings} />
      </>
    );

    expect(wrapper.find('MockChildComponent').get(0).props.barChart).toBeUndefined();
  });
});
