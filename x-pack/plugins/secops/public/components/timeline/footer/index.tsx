/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPopover,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { EuiToolTip } from '@elastic/eui';
import { DataProvider } from '../data_providers/data_provider';
import { OnChangeItemsPerPage, OnLoadMore } from '../events';
import { LastUpdatedAt } from './last_updated';

interface FooterProps {
  dataProviders: DataProvider[];
  itemsCount: number;
  isLoading: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  hasNextPage: boolean;
  height: number;
  nextCursor: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onLoadMore: OnLoadMore;
  serverSideEventCount: number;
  tieBreaker: string;
  updatedAt: number;
}

interface FooterState {
  isPopoverOpen: boolean;
  paginationLoading: boolean;
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
export const EventsCount = pure<{ serverSideEventCount: number; itemsCount: number }>(
  ({ itemsCount, serverSideEventCount }) => (
    <EuiToolTip content="The total count of events matching the search criteria">
      <h5>
        <EuiBadge color="hollow">{itemsCount}</EuiBadge> of{' '}
        <EuiBadge color="hollow">{serverSideEventCount}</EuiBadge> Events
      </h5>
    </EuiToolTip>
  )
);

const SpinnerAndEventCount = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const FooterContainer = styled.div<{ height: number }>`
  height: ${({ height }) => height}px;
  max-height: ${({ height }) => height}px;
  user-select: none;
`;

const PopoverRowItems = styled(EuiPopover)`
  .euiButtonEmpty__content {
    padding: 0px 0px;
  }
`;

/** Renders a loading indicator and paging controls */
export class Footer extends React.PureComponent<FooterProps, FooterState> {
  public readonly state = {
    isPopoverOpen: false,
    paginationLoading: false,
  };

  public componentDidUpdate(prevProps: FooterProps) {
    const { paginationLoading } = this.state;
    const { isLoading } = this.props;
    if (paginationLoading && prevProps.isLoading && !isLoading) {
      this.setState({
        ...this.state,
        paginationLoading: false,
      });
    }
  }

  public render() {
    const {
      dataProviders,
      height,
      isLoading,
      itemsCount,
      itemsPerPage,
      itemsPerPageOptions,
      onChangeItemsPerPage,
      serverSideEventCount,
      hasNextPage,
      updatedAt,
    } = this.props;

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.onButtonClick}
      >
        Rows: {itemsPerPage}
      </EuiButtonEmpty>
    );

    const rowItems =
      itemsPerPageOptions &&
      itemsPerPageOptions.map(item => (
        <EuiContextMenuItem
          key={`${item}-timeline-rows`}
          icon={itemsPerPage === item ? 'check' : 'empty'}
          onClick={() => {
            this.closePopover();
            onChangeItemsPerPage(item);
          }}
        >
          {`${item} rows`}
        </EuiContextMenuItem>
      ));

    return (
      <>
        <EuiHorizontalRule margin="xs" />
        {dataProviders.length !== 0 && (
          <FooterContainer height={height} data-test-subj="timeline-footer">
            <EuiFlexGroup
              gutterSize="none"
              alignItems="center"
              justifyContent="spaceBetween"
              direction="row"
            >
              <EuiFlexItem grow={false}>
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="flexStart"
                  justifyContent="flexStart"
                  direction="column"
                >
                  <EuiFlexItem>
                    <SpinnerAndEventCount data-test-subj="spinner-and-event-count">
                      {!hasNextPage && <LoadingSpinner show={isLoading} />}
                      <EventsCount
                        itemsCount={itemsCount}
                        serverSideEventCount={serverSideEventCount}
                      />
                    </SpinnerAndEventCount>
                  </EuiFlexItem>
                  {hasNextPage && (
                    <EuiFlexItem>
                      <PopoverRowItems
                        className="footer-popover"
                        id="customizablePagination"
                        data-test-subj="loadingMoreSizeRowPopover"
                        button={button}
                        isOpen={this.state.isPopoverOpen}
                        closePopover={this.closePopover}
                        panelPaddingSize="none"
                      >
                        <EuiContextMenuPanel
                          items={rowItems}
                          data-test-subj="loadingMorePickSizeRow"
                        />
                      </PopoverRowItems>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
              {hasNextPage && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup
                    gutterSize="none"
                    alignItems="flexStart"
                    justifyContent="center"
                    direction="row"
                  >
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        data-test-subj="loadingMoreButton"
                        isLoading={isLoading}
                        onClick={this.loadMore}
                      >
                        {isLoading ? 'Loading...' : 'Load More'}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <LastUpdatedAt updatedAt={updatedAt} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </FooterContainer>
        )}
      </>
    );
  }

  private loadMore = () => {
    this.setState({
      ...this.state,
      paginationLoading: true,
    });
    this.props.onLoadMore(this.props.nextCursor, this.props.tieBreaker);
  };

  private onButtonClick = () => {
    this.setState({
      ...this.state,
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      ...this.state,
      isPopoverOpen: false,
    });
  };
}
