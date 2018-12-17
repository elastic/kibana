/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLoadingSpinner } from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { EuiTablePagination, EuiToolTip } from '@elastic/eui';
import { DataProvider } from '../data_providers/data_provider';
import { OnChangeItemsPerPage, OnChangePage } from '../events';

interface FooterProps {
  activePage: number;
  dataProviders: DataProvider[];
  height: number;
  isLoading: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  onChangeItemsPerPage: OnChangeItemsPerPage;
  pageCount: number;
  serverSideEventCount: number;
  onChangePage: OnChangePage;
}

/** The height of the footer, exported for use in height calculations */
export const footerHeight = 50; // px

const LoadingSpinnerContainer = styled.span`
  margin: 0 5px 0 5px;
`;

/** Displays a loading spinner in a fixed width */
export const LoadingSpinner = pure<{ show: boolean }>(({ show }) => (
  <LoadingSpinnerContainer data-test-subj="loadingSpinnerContainer">
    {show ? (
      <EuiToolTip content="Loading events">
        <EuiLoadingSpinner size="m" />
      </EuiToolTip>
    ) : null}
  </LoadingSpinnerContainer>
));

/** Displays the server-side count of events */
export const ServerSideEventCount = pure<{ serverSideEventCount: number }>(
  ({ serverSideEventCount }) => (
    <EuiToolTip content="The total count of events matching the search criteria">
      <span>{serverSideEventCount !== Infinity ? `${serverSideEventCount}` : '\u221e'} Events</span>
    </EuiToolTip>
  )
);

const SpinnerAndEventCount = styled.div`
  display: flex;
  flex-direction: row;
  height: 300px;
  align-items: center;
`;

const FooterContainer = styled.div<{ height: number }>`
  display: flex;
  flex-direction: column;
  height: ${({ height }) => height}px;
  max-height: ${({ height }) => height}px;
  user-select: none;
`;

/** Renders a loading indicator and paging controls */
export const Footer = pure<FooterProps>(
  ({
    activePage,
    dataProviders,
    height,
    isLoading,
    itemsPerPage,
    itemsPerPageOptions,
    onChangeItemsPerPage,
    pageCount,
    serverSideEventCount = Infinity, // TODO: pass the real server side page count
    onChangePage,
  }) => (
    <>
      {dataProviders.length !== 0 && (
        <FooterContainer height={height} data-test-subj="timeline-footer">
          <div data-test-subj="table-pagination">
            <EuiTablePagination
              activePage={activePage}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={itemsPerPageOptions}
              pageCount={pageCount}
              onChangeItemsPerPage={onChangeItemsPerPage}
              onChangePage={onChangePage}
            />
          </div>
          <SpinnerAndEventCount data-test-subj="spinner-and-event-count">
            <LoadingSpinner show={isLoading} />
            <ServerSideEventCount serverSideEventCount={serverSideEventCount} />
          </SpinnerAndEventCount>
        </FooterContainer>
      )}
    </>
  )
);
