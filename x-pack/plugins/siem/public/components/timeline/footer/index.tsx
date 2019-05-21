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
  EuiIconTip,
  EuiPopover,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { LoadingPanel } from '../../loading';
import { OnChangeItemsPerPage, OnLoadMore } from '../events';

import { LastUpdatedAt } from './last_updated';
import * as i18n from './translations';

const FixedWidthLastUpdated = styled.div<{ compact: boolean }>`
  width: ${({ compact }) => (!compact ? 200 : 25)}px;
  overflow: hidden;
  text-align: end;
`;

const FooterContainer = styled(EuiFlexGroup)<{ height: number }>`
  height: ${({ height }) => height}px;
`;

const FooterFlexGroup = styled(EuiFlexGroup)`
  height: 35px;
  width: 100%;
`;

const LoadingPanelContainer = styled.div`
  padding-top: 3px;
`;

const PopoverRowItems = styled(EuiPopover)`
  .euiButtonEmpty__content {
    padding: 0px 0px;
  }
`;

export const ServerSideEventCount = styled.div`
  margin: 0 5px 0 5px;
`;

/** The height of the footer, exported for use in height calculations */
export const footerHeight = 40; // px

export const isCompactFooter = (width: number): boolean => width < 600;

interface FooterProps {
  itemsCount: number;
  isLive: boolean;
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
      <EuiButton
        data-test-subj="TimelineMoreButton"
        isLoading={isLoading}
        onClick={loadMore}
        size="s"
      >
        {isLoading ? `${i18n.LOADING}...` : i18n.LOAD_MORE}
      </EuiButton>
    )}
  </>
));

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
      height,
      isLive,
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
        <LoadingPanelContainer>
          <LoadingPanel
            data-test-subj="LoadingPanelTimeline"
            height="35px"
            showBorder={false}
            text={`${i18n.LOADING_TIMELINE_DATA}...`}
            width="100%"
          />
        </LoadingPanelContainer>
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
        <FooterContainer
          data-test-subj="timeline-footer"
          direction="column"
          height={height}
          gutterSize="none"
          justifyContent="spaceAround"
        >
          <FooterFlexGroup
            alignItems="center"
            data-test-subj="footer-flex-group"
            direction="row"
            gutterSize="none"
            justifyContent="spaceBetween"
          >
            <EuiFlexItem data-test-subj="event-count-container" grow={false}>
              <EuiFlexGroup
                alignItems="center"
                data-test-subj="events-count"
                direction="row"
                gutterSize="none"
              >
                <EventsCount
                  closePopover={this.closePopover}
                  isOpen={this.state.isPopoverOpen}
                  items={rowItems}
                  itemsCount={itemsCount}
                  onClick={this.onButtonClick}
                  serverSideEventCount={serverSideEventCount}
                />
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="paging-control-container" grow={false}>
              {isLive ? (
                <EuiText size="s" data-test-subj="is-live-on-message">
                  <b>
                    {i18n.AUTO_REFRESH_ACTIVE}
                    <EuiIconTip
                      content={
                        <FormattedMessage
                          id="xpack.siem.footer.autoRefreshActiveTooltip"
                          defaultMessage="While auto-refresh is enabled, timeline will show you the latest {numberOfItems} events that match your query."
                          values={{
                            numberOfItems: itemsCount,
                          }}
                        />
                      }
                      position="top"
                    />
                  </b>
                </EuiText>
              ) : (
                <PagingControl
                  data-test-subj="paging-control"
                  hasNextPage={hasNextPage}
                  isLoading={isLoading}
                  loadMore={this.loadMore}
                />
              )}
            </EuiFlexItem>

            <EuiFlexItem data-test-subj="last-updated-container" grow={false}>
              <FixedWidthLastUpdated
                data-test-subj="fixed-width-last-updated"
                compact={isCompactFooter(width)}
              >
                <LastUpdatedAt
                  updatedAt={this.state.updatedAt || getUpdatedAt()}
                  compact={isCompactFooter(width)}
                />
              </FixedWidthLastUpdated>
            </EuiFlexItem>
          </FooterFlexGroup>
        </FooterContainer>
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
