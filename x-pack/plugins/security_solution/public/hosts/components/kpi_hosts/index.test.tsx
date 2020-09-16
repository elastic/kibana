/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockHostsKpiData, mockKpiHostDetailsData } from './mock';
import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import '../../../common/mock/match_media';
import { HostsKpiComponentBase } from '.';
import * as statItems from '../../../common/components/stat_items';

describe('HostsKpiComponent', () => {
  const ID = 'kpiHost';
  const from = '2019-06-15T06:00:00.000Z';
  const to = '2019-06-18T06:00:00.000Z';
  const narrowDateRange = () => {};
  describe('render', () => {
    test('it should render spinner if it is loading', () => {
      const wrapper: ShallowWrapper = shallow(
        <HostsKpiComponentBase
          data={mockHostsKpiData}
          from={from}
          id={ID}
          loading={true}
          to={to}
          narrowDateRange={narrowDateRange}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it should render HostsKpiData', () => {
      const wrapper: ShallowWrapper = shallow(
        <HostsKpiComponentBase
          data={mockHostsKpiData}
          from={from}
          id={ID}
          loading={false}
          to={to}
          narrowDateRange={narrowDateRange}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it should render KpiHostDetailsData', () => {
      const wrapper: ShallowWrapper = shallow(
        <HostsKpiComponentBase
          data={mockKpiHostDetailsData}
          from={from}
          id={ID}
          loading={false}
          to={to}
          narrowDateRange={narrowDateRange}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });
  });

  const table = [
    [mockHostsKpiData, HostsKpiMapping] as [typeof mockHostsKpiData, typeof HostsKpiMapping],
    [mockKpiHostDetailsData, kpiHostDetailsMapping] as [
      typeof mockKpiHostDetailsData,
      typeof kpiHostDetailsMapping
    ],
  ];

  describe.each(table)(
    'it should handle HostsKpiProps and KpiHostDetailsProps',
    (data, mapping) => {
      let mockUseKpiMatrixStatus: jest.SpyInstance;
      beforeAll(() => {
        mockUseKpiMatrixStatus = jest.spyOn(statItems, 'useKpiMatrixStatus');
      });

      beforeEach(() => {
        shallow(
          <HostsKpiComponentBase
            data={data}
            from={from}
            id={ID}
            loading={false}
            to={to}
            narrowDateRange={narrowDateRange}
          />
        );
      });

      afterEach(() => {
        mockUseKpiMatrixStatus.mockClear();
      });

      afterAll(() => {
        mockUseKpiMatrixStatus.mockRestore();
      });

      test(`it should apply correct mapping by given data type`, () => {
        expect(mockUseKpiMatrixStatus).toBeCalledWith(mapping, data, ID, from, to, narrowDateRange);
      });
    }
  );
});
