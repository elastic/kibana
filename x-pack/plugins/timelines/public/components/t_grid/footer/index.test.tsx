/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../../mock/test_providers';

import { FooterComponent, PagingControlComponent } from '.';

describe('Footer Timeline Component', () => {
  const loadMore = jest.fn();
  const serverSideEventCount = 15546;
  const itemsCount = 2;

  describe('rendering', () => {
    test('it renders the default timeline footer', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={false}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
          />
        </TestProviders>
      );

      expect(wrapper.find('FooterContainer').exists()).toBeTruthy();
    });

    test('it renders the loading panel at the beginning ', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={true}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="LoadingPanelTimeline"]').exists()).toBeTruthy();
    });

    test('it renders the loadMore button if need to fetch more', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={false}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-pagination"]').exists()).toBeTruthy();
    });

    test('it renders the Loading... in the more load button when fetching new data', () => {
      const wrapper = shallow(
        <PagingControlComponent
          activePage={0}
          totalCount={30}
          totalPages={3}
          onPageClick={loadMore}
          isLoading={true}
        />
      );

      const loadButton = wrapper.text();
      expect(wrapper.find('[data-test-subj="LoadingPanelTimeline"]').exists()).toBeFalsy();
      expect(loadButton).toContain('Loading...');
    });

    test('it renders the Pagination in the more load button when fetching new data', () => {
      const wrapper = shallow(
        <PagingControlComponent
          activePage={0}
          totalCount={30}
          totalPages={3}
          onPageClick={loadMore}
          isLoading={false}
        />
      );

      expect(wrapper.find('[data-test-subj="timeline-pagination"]').exists()).toBeTruthy();
    });

    test('it does NOT render the loadMore button because there is nothing else to fetch', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={true}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timeline-pagination"]').exists()).toBeFalsy();
    });

    test('it render popover to select new itemsPerPage in timeline', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={false}
            itemsCount={itemsCount}
            itemsPerPage={1}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
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
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={false}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
          />
        </TestProviders>
      );

      wrapper.find('[data-test-subj="pagination-button-next"]').first().simulate('click');
      expect(loadMore).toBeCalled();
    });

    // test('Should call onChangeItemsPerPage when you pick a new limit', () => {
    //   const wrapper = mount(
    //     <TestProviders>
    //       <FooterComponent
    //         activePage={0}
    //         updatedAt={updatedAt}
    //         height={100}
    //         id={'timeline-id'}
    //         isLive={false}
    //         isLoading={false}
    //         itemsCount={itemsCount}
    //         itemsPerPage={1}
    //         itemsPerPageOptions={[1, 5, 10, 20]}
    //         onChangePage={loadMore}
    //         totalCount={serverSideEventCount}
    //       />
    //     </TestProviders>
    //   );

    //   wrapper.find('[data-test-subj="timelineSizeRowPopover"] button').first().simulate('click');
    //   wrapper.update();
    //   wrapper.find('[data-test-subj="timelinePickSizeRow"] button').first().simulate('click');
    //   expect(onChangeItemsPerPage).toBeCalled();
    // });

    test('it does render the auto-refresh message instead of load more button when stream live is on', () => {
      const wrapper = mount(
        <TestProviders>
          <FooterComponent
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={true}
            isLoading={false}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
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
            activePage={0}
            height={100}
            id={'timeline-id'}
            isLive={false}
            isLoading={false}
            itemsCount={itemsCount}
            itemsPerPage={2}
            itemsPerPageOptions={[1, 5, 10, 20]}
            onChangePage={loadMore}
            totalCount={serverSideEventCount}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="paging-control"]').exists()).toBeTruthy();
      expect(wrapper.find('[data-test-subj="is-live-on-message"]').exists()).toBeFalsy();
    });
  });
});
