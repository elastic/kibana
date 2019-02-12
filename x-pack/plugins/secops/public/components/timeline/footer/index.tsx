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

const PagingContainer = styled.div`
  padding: 0 10px 0 10px;
`;

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
  getUpdatedAt: () => number;
  width: number;
}

interface FooterState {
  isPopoverOpen: boolean;
  paginationLoading: boolean;
  updatedAt: number | null;
}

/** The height of the footer, exported for use in height calculations */
export const footerHeight = 55; // px

export const ServerSideEventCount = styled.div`
  margin: 0 5px 0 5px;
`;

/** Displays the server-side count of events */
export const EventsCount = pure<{
  closePopover: () => void;
  isOpen: boolean;
  items: React.ReactNode[];
  itemsCount: number;
  onClick: () => void;
  serverSideEventCount: number;
}>(({ closePopover, isOpen, items, itemsCount, onClick, serverSideEventCount }) => (
  <h5>
    <PopoverRowItems
      className="footer-popover"
      id="customizablePagination"
      data-test-subj="timelineSizeRowPopover"
      button={
        <>
          <EuiBadge color="hollow">
            {itemsCount}
            <EuiButtonEmpty
              size="s"
              color="text"
              iconType="arrowDown"
              iconSide="right"
              onClick={onClick}
            />
          </EuiBadge>
          {` ${i18n.OF} `}
        </>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel items={items} data-test-subj="timelinePickSizeRow" />
    </PopoverRowItems>
    <EuiToolTip content={`${serverSideEventCount} ${i18n.TOTAL_COUNT_OF_EVENTS}`}>
      <ServerSideEventCount>
        <EuiBadge color="hollow">{serverSideEventCount}</EuiBadge> {i18n.EVENTS}
      </ServerSideEventCount>
    </EuiToolTip>
  </h5>
));

export const PagingControl = pure<{
  hasNextPage: boolean;
  isLoading: boolean;
  loadMore: () => void;
}>(({ hasNextPage, isLoading, loadMore }) => (
  <>
    {hasNextPage && (
      <PagingContainer>
        <EuiButton
          data-test-subj="TimelineMoreButton"
          isLoading={isLoading}
          onClick={loadMore}
          size="s"
        >
          {isLoading ? `${i18n.LOADING}...` : i18n.LOAD_MORE}
        </EuiButton>
      </PagingContainer>
    )}
  </>
));

export const shortLastUpdated = (width: number): boolean => width < 500;

const SpinnerAndEventCount = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const FooterContainer = styled.div<{ height: number }>`
  height: ${({ height }) => height}px;
  max-height: ${({ height }) => height}px;
  overflow: hidden;
  padding-top: 4px;
  text-overflow: ellipsis;
  user-select: none;
  white-space: nowrap;
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
    updatedAt: null,
  };

  public componentDidUpdate(prevProps: FooterProps) {
    const { paginationLoading, updatedAt } = this.state;
    const { isLoading, getUpdatedAt } = this.props;
    if (paginationLoading && prevProps.isLoading && !isLoading) {
      this.setState({
        ...this.state,
        paginationLoading: false,
        updatedAt: getUpdatedAt(),
      });
    }

    if (updatedAt === null || (prevProps.isLoading && !isLoading)) {
      this.setState({
        ...this.state,
        updatedAt: getUpdatedAt(),
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
      getUpdatedAt,
      width,
    } = this.props;

    if (isLoading && !this.state.paginationLoading) {
      return (
        <>
          <LoadingPanel
            data-test-subj="LoadingPanelTimeline"
            height="35px"
            showBorder={false}
            text={`${i18n.LOADING_TIMELINE_DATA}...`}
            width="100%"
          />
        </>
      );
    }

    const rowItems =
      itemsPerPageOptions &&
      itemsPerPageOptions.map(item => (
        <EuiContextMenuItem
          key={item}
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
        {dataProviders.length !== 0 && (
          <FooterContainer height={height} data-test-subj="timeline-footer">
            <EuiFlexGroup
              gutterSize="none"
              alignItems="center"
              justifyContent="spaceBetween"
              direction="row"
            >
              <EuiFlexItem grow={false}>
                <SpinnerAndEventCount data-test-subj="timeline-event-count">
                  <EventsCount
                    closePopover={this.closePopover}
                    isOpen={this.state.isPopoverOpen}
                    items={rowItems}
                    itemsCount={itemsCount}
                    onClick={this.onButtonClick}
                    serverSideEventCount={serverSideEventCount}
                  />
                </SpinnerAndEventCount>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <PagingControl
                  hasNextPage={hasNextPage}
                  isLoading={isLoading}
                  loadMore={this.loadMore}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LastUpdatedAt
                  updatedAt={this.state.updatedAt || getUpdatedAt()}
                  short={shortLastUpdated(width)}
                />
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
