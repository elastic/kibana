/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { getOr } from 'lodash/fp';
import * as React from 'react';

import { TestProviders } from '../../../mock/test_providers';

import { Footer } from './index';
import { mockData } from './mock';

describe('Footer Timeline Component', () => {
  const loadMore = jest.fn();
  const onChangeItemsPerPage = jest.fn();
  const getUpdatedAt = () => 1546878704036;
  const width = 500;

  describe('rendering', () => {
    test('it renders the default timeline footer', () => {
      const wrapper = shallow(
        <Footer
          serverSideEventCount={mockData.Events.totalCount}
          hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
          height={100}
          isLoading={false}
          itemsCount={mockData.Events.edges.length}
          itemsPerPage={2}
          itemsPerPageOptions={[1, 5, 10, 20]}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onLoadMore={loadMore}
          nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
          tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
          getUpdatedAt={getUpdatedAt}
          width={width}
        />
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the loading panel at the beginning ', () => {
      const wrapper = mount(
        <Footer
          serverSideEventCount={mockData.Events.totalCount}
          hasNextPage={false}
          height={100}
          isLoading={true}
          itemsCount={mockData.Events.edges.length}
          itemsPerPage={2}
          itemsPerPageOptions={[1, 5, 10, 20]}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onLoadMore={loadMore}
          nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
          tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
          getUpdatedAt={getUpdatedAt}
          width={width}
        />
      );

      expect(wrapper.find('[data-test-subj="LoadingPanelTimeline"]').exists()).toBeTruthy();
    });

    test('it renders the loadMore button if need to fetch more', () => {
      const wrapper = mount(
        <TestProviders>
          <Footer
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            getUpdatedAt={getUpdatedAt}
            width={width}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="TimelineMoreButton"]').exists()).toBeTruthy();
    });

    test('it renders the Loading... in the more load button when fetching new data', () => {
      const wrapper = mount(
        <TestProviders>
          <Footer
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLoading={true}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            getUpdatedAt={getUpdatedAt}
            width={width}
          />
        </TestProviders>
      );
      wrapper
        .find(Footer)
        .instance()
        .setState({ paginationLoading: true });
      wrapper.update();
      expect(wrapper.find('[data-test-subj="LoadingPanelTimeline"]').exists()).toBeFalsy();
      expect(
        wrapper
          .find('[data-test-subj="TimelineMoreButton"]')
          .first()
          .text()
      ).toContain('Loading...');
    });

    test('it does NOT render the loadMore button because there is nothing else to fetch', () => {
      const wrapper = mount(
        <Footer
          serverSideEventCount={mockData.Events.totalCount}
          hasNextPage={false}
          height={100}
          isLoading={true}
          itemsCount={mockData.Events.edges.length}
          itemsPerPage={2}
          itemsPerPageOptions={[1, 5, 10, 20]}
          onChangeItemsPerPage={onChangeItemsPerPage}
          onLoadMore={loadMore}
          nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
          tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
          getUpdatedAt={getUpdatedAt}
          width={width}
        />
      );

      expect(wrapper.find('[data-test-subj="TimelineMoreButton"]').exists()).toBeFalsy();
    });

    test('it render popover to select new itemsPerPage in timeline', () => {
      const wrapper = mount(
        <TestProviders>
          <Footer
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={1}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            getUpdatedAt={getUpdatedAt}
            width={width}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="timelineSizeRowPopover"] button')
        .first()
        .simulate('click');
      expect(wrapper.find('[data-test-subj="timelinePickSizeRow"]').exists()).toBeTruthy();
    });
  });

  describe('Events', () => {
    test('should call loadmore when clicking on the button load more', () => {
      const wrapper = mount(
        <TestProviders>
          <Footer
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            getUpdatedAt={getUpdatedAt}
            width={width}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="TimelineMoreButton"]')
        .first()
        .simulate('click');

      expect(loadMore).toBeCalled();
    });

    test('Should call onChangeItemsPerPage when you pick a new limit', () => {
      const wrapper = mount(
        <TestProviders>
          <Footer
            serverSideEventCount={mockData.Events.totalCount}
            hasNextPage={getOr(false, 'hasNextPage', mockData.Events.pageInfo)!}
            height={100}
            isLoading={false}
            itemsCount={mockData.Events.edges.length}
            itemsPerPage={1}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangeItemsPerPage={onChangeItemsPerPage}
            onLoadMore={loadMore}
            nextCursor={getOr(null, 'endCursor.value', mockData.Events.pageInfo)!}
            tieBreaker={getOr(null, 'endCursor.tiebreaker', mockData.Events.pageInfo)!}
            getUpdatedAt={getUpdatedAt}
            width={width}
          />
        </TestProviders>
      );

      wrapper
        .find('[data-test-subj="timelineSizeRowPopover"] button')
        .first()
        .simulate('click');
      wrapper.update();
      wrapper
        .find('[data-test-subj="timelinePickSizeRow"] button')
        .first()
        .simulate('click');
      expect(onChangeItemsPerPage).toBeCalled();
    });
  });
});
