/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';

import { TestProviders } from '../../../../common/mock';
import { hostsModel } from '../../store';
import { getEmptyValue } from '../../../../common/components/empty_value';
import { useMountAppended } from '../../../../common/utils/use_mount_appended';

import { UncommonProcessTable } from '.';
import { mockData } from './mock';

jest.mock('../../../../common/lib/kibana');

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});

jest.mock('../../../../common/components/link_to');

describe('Uncommon Process Table Component', () => {
  const loadPage = jest.fn();
  const mount = useMountAppended();

  const defaultProps = {
    data: mockData.edges,
    fakeTotalCount: getOr(50, 'fakeTotalCount', mockData.pageInfo),
    id: 'uncommonProcess',
    isInspect: false,
    loading: false,
    loadPage,
    setQuerySkip: jest.fn(),
    showMorePagesIndicator: getOr(false, 'showMorePagesIndicator', mockData.pageInfo),
    totalCount: mockData.totalCount,
    type: hostsModel.HostsType.page,
  };

  describe('rendering', () => {
    test('it renders the default Uncommon process table', () => {
      const wrapper = shallow(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('UncommonProcessTable')).toMatchSnapshot();
    });

    test('it has a double dash (empty value) without any hosts at all', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('tr.euiTableRow').at(0).find('td.euiTableRowCell').at(3).text()).toBe(
        `${getEmptyValue()}`
      );
    });

    test('it has a single host without any extra comma when the number of hosts is exactly 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('tr.euiTableRow').at(1).find('td.euiTableRowCell').at(3).text()).toBe(
        'hello-world '
      );
    });

    test('it has a single link when the number of hosts is exactly 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(
        wrapper.find('tr.euiTableRow').at(1).find('td.euiTableRowCell').at(3).find('a').length
      ).toBe(1);
    });

    test('it has a comma separated list of hosts when the number of hosts is greater than 1', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(wrapper.find('tr.euiTableRow').at(2).find('td.euiTableRowCell').at(3).text()).toBe(
        'hello-worldhello-world-2 '
      );
    });

    test('it has 2 links when the number of hosts is equal to 2', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );

      expect(
        wrapper.find('tr.euiTableRow').at(2).find('td.euiTableRowCell').at(3).find('a').length
      ).toBe(2);
    });

    test('it is empty when all hosts are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('tr.euiTableRow').at(3).find('td.euiTableRowCell').at(3).text()).toBe(
        `${getEmptyValue()}`
      );
    });

    test('it has no link when all hosts are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(
        wrapper.find('tr.euiTableRow').at(3).find('td.euiTableRowCell').at(3).find('a').length
      ).toBe(0);
    });

    test('it is returns two hosts when others are invalid because they do not contain an id and a name', () => {
      const wrapper = mount(
        <TestProviders>
          <UncommonProcessTable {...defaultProps} />
        </TestProviders>
      );
      expect(wrapper.find('tr.euiTableRow').at(4).find('td.euiTableRowCell').at(3).text()).toBe(
        'hello-worldhello-world-2 '
      );
    });
  });
});
