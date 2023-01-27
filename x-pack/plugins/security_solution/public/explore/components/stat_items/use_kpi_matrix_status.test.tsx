/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';
import type { StatItemsProps, StatItems } from '.';

import { fieldsMapping as fieldTitleChartMapping } from '../../network/components/kpi_network/unique_private_ips';
import {
  mockData,
  mockEnableChartsData,
  mockNoChartMappings,
  mockUpdateDateRange,
} from '../../network/components/kpi_network/mock';

import type {
  HostsKpiStrategyResponse,
  NetworkKpiStrategyResponse,
} from '../../../../common/search_strategy';
import { useKpiMatrixStatus } from './use_kpi_matrix_status';
const mockSetQuerySkip = jest.fn();
const from = '2019-06-15T06:00:00.000Z';
const to = '2019-06-18T06:00:00.000Z';

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
      mockUpdateDateRange,
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
