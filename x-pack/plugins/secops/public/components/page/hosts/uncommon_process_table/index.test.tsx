/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';

import { TestProviders } from '../../../../mock';
import { hostsModel } from '../../../../store';
import { getEmptyValue } from '../../../empty_value';

import { UncommonProcessTable } from './index';
import { mockData } from './mock';

describe('UncommonProcess Table Component', () => {
  const loadMore = jest.fn();

  describe('rendering', () => {
    test('it renders the default Uncommon process table', () => {
      const wrapper = shallow(
        <TestProviders>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it has a double dash (empty value) without any hosts at all', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(0)
          .text()
      ).toBe(getEmptyValue());
    });

    test('it has a single host without any extra comma when the number of hosts exactly 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(1)
          .text()
      ).toBe('hello-world');
    });

    test('it has a comma separated list of hosts when the number of hosts is greater than 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(2)
          .text()
      ).toBe('hello-world,\u00a0hello-world-2');
    });

    test('it is empty when all hosts are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(3)
          .text()
      ).toBe(getEmptyValue());
    });

    test('it is returns two hosts when others are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable
            loading={false}
            data={mockData.UncommonProcess.edges}
            totalCount={mockData.UncommonProcess.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.UncommonProcess.pageInfo)!}
            nextCursor={getOr(null, 'endCursor.value', mockData.UncommonProcess.pageInfo)!}
            loadMore={loadMore}
            startDate={1546965070707}
            type={hostsModel.HostsType.page}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-header="Hosts"]')
          .at(4)
          .text()
      ).toBe('hello-world,\u00a0hello-world-2');
    });
  });
});
