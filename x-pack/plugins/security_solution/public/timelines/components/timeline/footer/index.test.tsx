/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../../../common/mock/test_providers';

import { FooterComponent, PagingControlComponent } from '.';
import { TimelineId } from '../../../../../common/types/timeline';

jest.mock('../../../../common/lib/kibana');

describe('Footer Timeline Component', () => {
  const loadMore = jest.fn();
  const updatedAt = 1546878704036;
  const serverSideEventCount = 15546;
  const itemsCount = 2;

  describe('rendering', () => {
    it('shoult render the default timeline footer', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      expect(screen.getByTestId('timeline-footer')).toBeInTheDocument();
    });

    it('should render the loading panel at the beginning ', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      expect(screen.getByTestId('LoadingPanelTimeline')).toBeInTheDocument();
    });

    it('should render the loadMore button if it needs to fetch more', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      expect(screen.getByTestId('timeline-pagination')).toBeInTheDocument();
    });

    it('should render `Loading...` when fetching new data', () => {
      render(
        <PagingControlComponent
          activePage={0}
          totalCount={30}
          totalPages={3}
          onPageClick={loadMore}
          isLoading={true}
        />
      );

      expect(screen.queryByTestId('LoadingPanelTimeline')).not.toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render the Pagination in the more load button when fetching new data', () => {
      render(
        <PagingControlComponent
          activePage={0}
          totalCount={30}
          totalPages={3}
          onPageClick={loadMore}
          isLoading={false}
        />
      );

      expect(screen.getByTestId('timeline-pagination')).toBeInTheDocument();
    });

    it('should NOT render the loadMore button because there is nothing else to fetch', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      expect(screen.queryByTestId('timeline-pagination')).not.toBeInTheDocument();
    });

    it('should render the popover to select new itemsPerPage in timeline', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      fireEvent.click(screen.getByTestId('local-events-count-button'));
      expect(screen.getByTestId('timelinePickSizeRow')).toBeInTheDocument();
    });
  });

  describe('Events', () => {
    it('should call loadmore when clicking on the button load more', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      fireEvent.click(screen.getByTestId('pagination-button-next'));
      expect(loadMore).toBeCalled();
    });

    it('should render the auto-refresh message instead of load more button when stream live is on', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      expect(screen.queryByTestId('timeline-pagination')).not.toBeInTheDocument();
      expect(screen.getByTestId('is-live-on-message')).toBeInTheDocument();
    });

    it('should render the load more button when stream live is off', () => {
      render(
        <TestProviders>
          <FooterComponent
            activePage={0}
            updatedAt={updatedAt}
            height={100}
            id={TimelineId.test}
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

      expect(screen.getByTestId('timeline-pagination')).toBeInTheDocument();
      expect(screen.queryByTestId('is-live-on-message')).not.toBeInTheDocument();
    });
  });
});
