/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { Direction } from '../../graphql/types';

import { PaginatedTable } from './index';
import { getHostsColumns, mockData, rowItems, sortedHosts } from './index.mock';

jest.mock('react', () => {
  const r = jest.requireActual('react');
  return { ...r, memo: (x: any) => x };
});

describe('Load More Table Component', () => {
  let loadPage: jest.Mock<any>;
  let updateLimitPagination: jest.Mock<any>;
  let updateActivePage: jest.Mock<any>;
  beforeEach(() => {
    loadPage = jest.fn();
    updateLimitPagination = jest.fn();
    updateActivePage = jest.fn();
  });

  describe('rendering', () => {
    test('it renders the default load more table', () => {
      const wrapper = shallow(
        <span>
          <PaginatedTable
            columns={getHostsColumns()}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={false}
            loadingTitle="Hosts"
            loadPage={newActivePage => loadPage(newActivePage)}
            pageOfItems={mockData.Hosts.edges}
            totalCount={10}
            updateActivePage={activePage => updateActivePage(activePage)}
            updateLimitPagination={limit => updateLimitPagination({ limit })}
          />
        </span>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the loading panel at the beginning ', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={true}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={[]}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      expect(
        wrapper.find('[data-test-subj="InitialLoadingPanelPaginatedTable"]').exists()
      ).toBeTruthy();
    });

    test('it renders the over loading panel after data has been in the table ', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={true}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      expect(wrapper.find('[data-test-subj="LoadingPanelPaginatedTable"]').exists()).toBeTruthy();
    });

    test('it renders the correct amount of pages and starts at activePage: 0', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={updateActivePage}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      const paginiationProps = wrapper
        .find('[data-test-subj="numberedPagination"]')
        .first()
        .props();

      const expectedPaginationProps = {
        'data-test-subj': 'numberedPagination',
        pageCount: 10,
        activePage: 0,
      };
      expect(JSON.stringify(paginiationProps)).toEqual(JSON.stringify(expectedPaginationProps));
    });

    test('it render popover to select new limit in table', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      wrapper
        .find('[data-test-subj="loadingMoreSizeRowPopover"] button')
        .first()
        .simulate('click');
      expect(wrapper.find('[data-test-subj="loadingMorePickSizeRow"]').exists()).toBeTruthy();
    });

    test('it will NOT render popover to select new limit in table if props itemsPerRow is empty', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={[]}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      expect(wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"]').exists()).toBeFalsy();
    });

    test('It should render a sort icon if sorting is defined', () => {
      const mockOnChange = jest.fn();
      const wrapper = mount(
        <PaginatedTable
          columns={sortedHosts}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadPage={jest.fn()}
          onChange={mockOnChange}
          pageOfItems={mockData.Hosts.edges}
          sorting={{ direction: Direction.asc, field: 'node.host.name' }}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      expect(wrapper.find('.euiTable thead tr th button svg')).toBeTruthy();
    });
  });

  describe('Events', () => {
    test('should call updateActivePage with 1 when clicking to the first page', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );
      wrapper
        .find('[data-test-subj="pagination-button-next"]')
        .first()
        .simulate('click');
      expect(updateActivePage.mock.calls[0][0]).toEqual(1);
    });

    test('Should call updateActivePage with 0 when you pick a new limit', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );
      wrapper
        .find('[data-test-subj="pagination-button-next"]')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="loadingMoreSizeRowPopover"] button')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="loadingMorePickSizeRow"] button')
        .first()
        .simulate('click');
      expect(updateActivePage.mock.calls[1][0]).toEqual(0);
    });

    test('should call updateActivePage with 0 when an update prop changes', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
          updateProps={{ isThisAwesome: false }}
        />
      );
      wrapper
        .find('[data-test-subj="pagination-button-next"]')
        .first()
        .simulate('click');
      wrapper.setProps({ updateProps: { isThisAwesome: true } });
      // enzyme does not have full support for react.memo
      // wrapper will not update without the click below
      wrapper
        .find('[data-test-subj="pagination-button-4"]')
        .first()
        .simulate('click');
      expect(updateActivePage.mock.calls[1][0]).toEqual(0);
    });

    test('Should call updateLimitPagination when you pick a new limit', () => {
      const wrapper = mount(
        <PaginatedTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadPage={newActivePage => loadPage(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      wrapper
        .find('[data-test-subj="loadingMoreSizeRowPopover"] button')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="loadingMorePickSizeRow"] button')
        .first()
        .simulate('click');
      expect(updateLimitPagination).toBeCalled();
    });

    test('Should call onChange when you choose a new sort in the table', () => {
      const mockOnChange = jest.fn();
      const wrapper = mount(
        <PaginatedTable
          columns={sortedHosts}
          headerCount={1}
          headerSupplement={<p>{'My test supplement.'}</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadPage={jest.fn()}
          onChange={mockOnChange}
          pageOfItems={mockData.Hosts.edges}
          sorting={{ direction: Direction.asc, field: 'node.host.name' }}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      wrapper
        .find('.euiTable thead tr th button')
        .first()
        .simulate('click');

      expect(mockOnChange).toBeCalled();
      expect(mockOnChange.mock.calls[0]).toEqual([
        { page: undefined, sort: { direction: 'desc', field: 'node.host.name' } },
      ]);
    });
  });
});
