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
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { LoadingPanel } from '../../loading';
import { DataProvider } from '../data_providers/data_provider';
import { OnChangeItemsPerPage, OnLoadMore } from '../events';
import { LastUpdatedAt } from './last_updated';
import * as i18n from './translations';

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

    if (isLoading && !this.state.paginationLoading) {
      return (
        <LoadingPanel
          height="auto"
          width="100%"
          text={`${i18n.LOADING_TIMELINE_DATA}...`}
          data-test-subj="LoadingPanelTimeline"
        />
      );
    }

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
          {`${item} ${i18n.ROWS}`}
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
                    <SpinnerAndEventCount data-test-subj="timeline-event-count">
                      <EventsCount
                        itemsCount={itemsCount}
                        serverSideEventCount={serverSideEventCount}
                      />
                    </SpinnerAndEventCount>
                  </EuiFlexItem>
                  {serverSideEventCount > itemsPerPage && rowItems.length > 0 && (
                    <EuiFlexItem>
                      <PopoverRowItems
                        className="footer-popover"
                        id="customizablePagination"
                        data-test-subj="timelineSizeRowPopover"
                        button={button}
                        isOpen={this.state.isPopoverOpen}
                        closePopover={this.closePopover}
                        panelPaddingSize="none"
                      >
                        <EuiContextMenuPanel
                          items={rowItems}
                          data-test-subj="timelinePickSizeRow"
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
                        data-test-subj="TimelineMoreButton"
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
