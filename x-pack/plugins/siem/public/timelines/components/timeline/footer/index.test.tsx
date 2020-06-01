/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import { getOr } from 'lodash/fp';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';

import { FooterComponent, PagingControlComponent } from './index';
import { mockData } from './mock';

describe('Footer Timeline Component', () => {
  const loadMore = jest.fn();
  const onChangeItemsPerPage = jest.fn();
  const getUpdatedAt = () => 1546878704036;

  describe('rendering', () => {
    test('it renders the default timeline footer', () => {
      const wrapper = shallow(
        <FooterComponent
          serverSideEventCount={mockData.Events.totalCount}
          hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
          height={100}
          isLive={false}
          isLoading={false}
          itemsCount={mockData.Events.edges.length}
          itemsPerPage={2}
          itemsPerPageOptions={[1, 5, 10, 20]}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onLoadMore={loadMore}
          nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
          tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
          getUpdatedAt={getUpdatedAt}
        />
      );

      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the loading panel at the beginning ', () => {
      const wrapper = mount(
        <FooterComponent
          serverSideEventCount={mockData.Events.totalCount}
          hasNextPage={false}
          height={100}
          isLive={false}
          isLoading={true}
          itemsCount={mockData.Events.edges.length}
          itemsPerPage={2}
          itemsPerPageOptions={[1, 5, 10, 20]}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onLoadMore={loadMore}
          nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
          tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
          getUpdatedAt={getUpdatedAt}
        />
      );

      expect(wrapper.find('[data-test-subj="LoadingPanelTimeline"]').exists()).toBeTruthy();
    });

    test('it renders the loadMore button if need to fetch more', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLive={false}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
            getUpdatedAt={getUpdatedAt}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="TimelineMoreButton"]').exists()).toBeTruthy();
    });

    test('it renders the Loading... in the more load button when fetching new data', () => {
      const wrapper = shallow(
        <PagingControlComponent
          hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
          loadMore={loadMore}
          isLoading={true}
        />
      );

      const loadButton = wrapper.find('[data-test-subj="TimelineMoreButton"]').dive().text();
      expect(wrapper.find('[data-test-subj="LoadingPanelTimeline"]').exists()).toBeFalsy();
      expect(loadButton).toContain('Loading...');
    });

    test('it renders the Load More in the more load button when fetching new data', () => {
      const wrapper = shallow(
        <PagingControlComponent
          hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
          loadMore={loadMore}
          isLoading={false}
        />
      );

      const loadButton = wrapper.find('[data-test-subj="TimelineMoreButton"]').dive().text();
      expect(loadButton).toContain('Load more');
    });

    test('it does NOT render the loadMore button because there is nothing else to fetch', () => {
      const wrapper = mount(
        <FooterComponent
          serverSideEventCount={mockData.Events.totalCount}
          hasNextPage={false}
          height={100}
          isLive={false}
          isLoading={true}
          itemsCount={mockData.Events.edges.length}
          itemsPerPage={2}
          itemsPerPageOptions={[1, 5, 10, 20]}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onLoadMore={loadMore}
          nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
          tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
          getUpdatedAt={getUpdatedAt}
        />
      );

      expect(wrapper.find('[data-test-subj="TimelineMoreButton"]').exists()).toBeFalsy();
    });

    test('it render popover to select new itemsPerPage in timeline', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLive={false}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={1}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
            getUpdatedAt={getUpdatedAt}
          />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="timelineSizeRowPopover"] button').first().simulate('click');
      expect(wrapper.find('[data-test-subj="timelinePickSizeRow"]').exists()).toBeTruthy();
    });
  });

  describe('Events', () => {
    test('should call loadmore when clicking on the button load more', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLive={false}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
            getUpdatedAt={getUpdatedAt}
          />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="TimelineMoreButton"]').first().simulate('click');

      expect(loadMore).toBeCalled();
    });

    test('Should call onChangeItemsPerPage when you pick a new limit', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLive={false}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={1}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
            getUpdatedAt={getUpdatedAt}
          />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="timelineSizeRowPopover"] button').first().simulate('click');
      wrapper.update();
      wrapper.find('[data-test-subj="timelinePickSizeRow"] button').first().simulate('click');
      expect(onChangeItemsPerPage).toBeCalled();
    });

    test('it does render the auto-refresh message instead of load more button when stream live is on', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLive={true}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
            getUpdatedAt={getUpdatedAt}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="paging-control"]').exists()).toBeFalsy();
      expect(wrapper.find('[data-test-subj="is-live-on-message"]').exists()).toBeTruthy();
    });

    test('it does render the load more button when stream live is off', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLive={false}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)}
            getUpdatedAt={getUpdatedAt}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="paging-control"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="is-live-on-message"]').exists()).toBeFalsy();
    });
  });
});
