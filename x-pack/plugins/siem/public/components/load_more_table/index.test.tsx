/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { Direction } from '../../graphql/types';

import { LoadMoreTable } from './index';
import { getHostsColumns, mockData, rowItems, sortedHosts } from './index.mock';

jest.mock('react', () => {
  const r = jest.requireActual('react');

  return { ...r, memo: x => x };
});

describe('Load More Table Component', () => {
  let loadMore: jest.Mock<any>;
  let updateLimitPagination: jest.Mock<any>;
  let updateActivePage: jest.Mock<any>;
  beforeEach(() => {
    loadMore = jest.fn();
    updateLimitPagination = jest.fn();
    updateActivePage = jest.fn();
  })

  describe('rendering', () => {
    test('it renders the default load more table', () => {
      const wrapper = shallow(
        <span>
          <LoadMoreTable
            columns={getHostsColumns()}
            headerCount={1}
            headerSupplement={<p>My test supplement.</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={false}
            loadingTitle="Hosts"
            loadMore={newActivePage => loadMore(newActivePage)}
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
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={true}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
          pageOfItems={[]}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      expect(
        wrapper.find('[data-test-subj="InitialLoadingPanelLoadMoreTable"]').exists()
      ).toBeTruthy();
    });

    test('it renders the over loading panel after data has been in the table ', () => {
      const wrapper = mount(
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={true}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
          pageOfItems={mockData.Hosts.edges}
          totalCount={10}
          updateActivePage={activePage => updateActivePage(activePage)}
          updateLimitPagination={limit => updateLimitPagination({ limit })}
        />
      );

      expect(wrapper.find('[data-test-subj="LoadingPanelLoadMoreTable"]').exists()).toBeTruthy();
    });

    test('it renders the correct amount of pages and starts at activePage: 0', () => {
      const wrapper = mount(
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={false}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
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
        ['data-test-subj']: 'numberedPagination',
        pageCount: 10,
        activePage: 0,
      };
      expect(JSON.stringify(paginiationProps)).toEqual(JSON.stringify(expectedPaginationProps));
    });

    test('it render popover to select new limit in table', () => {
      const wrapper = mount(
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
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
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={[]}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
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
        <LoadMoreTable
          columns={sortedHosts}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadMore={jest.fn()}
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
    test('should call loadmore when clicking on the button load more', () => {
      const wrapper = mount(
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={1}
          loading={false}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
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

      expect(updateActivePage).toBeCalledWith(1);
      console.log('loadMore', loadMore.mock.calls)
      console.log('updateLimitPagination', updateLimitPagination.mock.calls)
      console.log('updateActivePage1', updateActivePage.mock.calls)
    });

    test('Should call updateActivePage with 0 when you pick a new limit', () => {
      const wrapper = mount(
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
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
      console.log('updateActivePage2', updateActivePage.mock.calls)
      expect(updateActivePage.mock.calls[1][0]).toEqual(0);
    });

    test('Should call updateLimitPagination when you pick a new limit', () => {
      const wrapper = mount(
        <LoadMoreTable
          columns={getHostsColumns()}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadMore={newActivePage => loadMore(newActivePage)}
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
        <LoadMoreTable
          columns={sortedHosts}
          headerCount={1}
          headerSupplement={<p>My test supplement.</p>}
          headerTitle="Hosts"
          headerTooltip="My test tooltip"
          headerUnit="Test Unit"
          itemsPerRow={rowItems}
          limit={2}
          loading={false}
          loadingTitle="Hosts"
          loadMore={jest.fn()}
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
