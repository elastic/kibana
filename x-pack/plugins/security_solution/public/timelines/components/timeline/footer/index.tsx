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
  EuiPopoverProps,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';

import { LoadingPanel } from '../../loading';
import { OnChangeItemsPerPage, OnLoadMore } from '../events';

import { LastUpdatedAt } from './last_updated';
import * as i18n from './translations';
import { useEventDetailsWidthContext } from '../../../../common/components/events_viewer/event_details_width_context';
import { useManageTimeline } from '../../manage_timeline';

export const isCompactFooter = (width: number): boolean => width < 600;

interface FixedWidthLastUpdatedContainerProps {
  updatedAt: number;
}

const FixedWidthLastUpdatedContainer = React.memo<FixedWidthLastUpdatedContainerProps>(
  ({ updatedAt }) => {
    const width = useEventDetailsWidthContext();
    const compact = useMemo(() => isCompactFooter(width), [width]);

    return (
      <FixedWidthLastUpdated data-test-subj="fixed-width-last-updated" compact={compact}>
        <LastUpdatedAt updatedAt={updatedAt} compact={compact} />
      </FixedWidthLastUpdated>
    );
  }
);

FixedWidthLastUpdatedContainer.displayName = 'FixedWidthLastUpdatedContainer';

const FixedWidthLastUpdated = styled.div<{ compact?: boolean }>`
  width: ${({ compact }) => (!compact ? 200 : 25)}px;
  overflow: hidden;
  text-align: end;
`;

FixedWidthLastUpdated.displayName = 'FixedWidthLastUpdated';

interface HeightProp {
  height: number;
}

const FooterContainer = styled(EuiFlexGroup).attrs<HeightProp>(({ height }) => ({
  style: {
    height: `${height}px`,
  },
}))<HeightProp>`
  flex: 0;
`;

FooterContainer.displayName = 'FooterContainer';

const FooterFlexGroup = styled(EuiFlexGroup)`
  height: 35px;
  width: 100%;
`;

FooterFlexGroup.displayName = 'FooterFlexGroup';

const LoadingPanelContainer = styled.div`
  padding-top: 3px;
`;

LoadingPanelContainer.displayName = 'LoadingPanelContainer';

const PopoverRowItems = styled((EuiPopover as unknown) as FC)<
  EuiPopoverProps & {
    className?: string;
    id?: string;
  }
>`
  .euiButtonEmpty__content {
    padding: 0px 0px;
  }
`;

PopoverRowItems.displayName = 'PopoverRowItems';

export const ServerSideEventCount = styled.div`
  margin: 0 5px 0 5px;
`;

ServerSideEventCount.displayName = 'ServerSideEventCount';

/** The height of the footer, exported for use in height calculations */
export const footerHeight = 40; // px

/** Displays the server-side count of events */
export const EventsCountComponent = ({
  closePopover,
  documentType,
  footerText,
  isOpen,
  items,
  itemsCount,
  onClick,
  serverSideEventCount,
}: {
  closePopover: () => void;
  documentType: string;
  isOpen: boolean;
  items: React.ReactElement[];
  itemsCount: number;
  onClick: () => void;
  serverSideEventCount: number;
  footerText: string;
}) => {
  return (
    <h5>
      <PopoverRowItems
        className="footer-popover"
        id="customizablePagination"
        data-test-subj="timelineSizeRowPopover"
        button={
          <>
            <EuiBadge data-test-subj="local-events-count" color="hollow">
              {itemsCount}
              <EuiButtonEmpty
                size="s"
                color="text"
                iconType="arrowDown"
                iconSide="right"
                onClick={onClick}
                data-test-subj="local-events-count-button"
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
      <EuiToolTip content={`${serverSideEventCount} ${footerText}`}>
        <ServerSideEventCount>
          <EuiBadge color="hollow" data-test-subj="server-side-event-count">
            {serverSideEventCount}
          </EuiBadge>{' '}
          {documentType}
        </ServerSideEventCount>
      </EuiToolTip>
    </h5>
  );
};

EventsCountComponent.displayName = 'EventsCountComponent';

export const EventsCount = React.memo(EventsCountComponent);

EventsCount.displayName = 'EventsCount';

export const PagingControlComponent = ({
  hasNextPage,
  isLoading,
  loadMore,
}: {
  hasNextPage: boolean;
  isLoading: boolean;
  loadMore: () => void;
}) => (
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
);

PagingControlComponent.displayName = 'PagingControlComponent';

export const PagingControl = React.memo(PagingControlComponent);

PagingControl.displayName = 'PagingControl';

interface FooterProps {
  getUpdatedAt: () => number;
  hasNextPage: boolean;
  height: number;
  id: string;
  isLive: boolean;
  isLoading: boolean;
  itemsCount: number;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  nextCursor: string;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onLoadMore: OnLoadMore;
  serverSideEventCount: number;
  tieBreaker: string;
}

/** Renders a loading indicator and paging controls */
export const FooterComponent = ({
  getUpdatedAt,
  hasNextPage,
  height,
  id,
  isLive,
  isLoading,
  itemsCount,
  itemsPerPage,
  itemsPerPageOptions,
  nextCursor,
  onChangeItemsPerPage,
  onLoadMore,
  serverSideEventCount,
  tieBreaker,
}: FooterProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  const { getManageTimelineById } = useManageTimeline();
  const { documentType, loadingText, footerText } = useMemo(() => getManageTimelineById(id), [
    getManageTimelineById,
    id,
  ]);

  const loadMore = useCallback(() => {
    setPaginationLoading(true);
    onLoadMore(nextCursor, tieBreaker);
  }, [nextCursor, tieBreaker, onLoadMore, setPaginationLoading]);

  const onButtonClick = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [
    isPopoverOpen,
    setIsPopoverOpen,
  ]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  useEffect(() => {
    if (paginationLoading && !isLoading) {
      setPaginationLoading(false);
      setUpdatedAt(getUpdatedAt());
    }

    if (updatedAt === null || !isLoading) {
      setUpdatedAt(getUpdatedAt());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (isLoading && !paginationLoading) {
    return (
      <LoadingPanelContainer>
        <LoadingPanel
          data-test-subj="LoadingPanelTimeline"
          height="35px"
          showBorder={false}
          text={`${loadingText}...`}
          width="100%"
        />
      </LoadingPanelContainer>
    );
  }

  const rowItems =
    itemsPerPageOptions &&
    itemsPerPageOptions.map((item) => (
      <EuiContextMenuItem
        key={item}
        icon={itemsPerPage === item ? 'check' : 'empty'}
        data-test-subj={`items-per-page-option-${item}`}
        onClick={() => {
          closePopover();
          onChangeItemsPerPage(item);
        }}
      >
        {`${item} ${i18n.ROWS}`}
      </EuiContextMenuItem>
    ));

  return (
    <FooterContainer
      data-test-subj="timeline-footer"
      direction="column"
      gutterSize="none"
      height={height}
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
              closePopover={closePopover}
              documentType={documentType}
              footerText={footerText}
              isOpen={isPopoverOpen}
              items={rowItems}
              itemsCount={itemsCount}
              onClick={onButtonClick}
              serverSideEventCount={serverSideEventCount}
            />
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="paging-control-container" grow={false}>
          {isLive ? (
            <EuiText size="s" data-test-subj="is-live-on-message">
              <b>
                {i18n.AUTO_REFRESH_ACTIVE}{' '}
                <EuiIconTip
                  color="subdued"
                  content={
                    <FormattedMessage
                      id="xpack.securitySolution.footer.autoRefreshActiveTooltip"
                      defaultMessage="While auto-refresh is enabled, timeline will show you the latest {numberOfItems} events that match your query."
                      values={{
                        numberOfItems: itemsCount,
                      }}
                    />
                  }
                  type="iInCircle"
                />
              </b>
            </EuiText>
          ) : (
            <PagingControl
              data-test-subj="paging-control"
              hasNextPage={hasNextPage}
              isLoading={isLoading}
              loadMore={loadMore}
            />
          )}
        </EuiFlexItem>

        <EuiFlexItem data-test-subj="last-updated-container" grow={false}>
          <FixedWidthLastUpdatedContainer updatedAt={updatedAt || getUpdatedAt()} />
        </EuiFlexItem>
      </FooterFlexGroup>
    </FooterContainer>
  );
};

FooterComponent.displayName = 'FooterComponent';

export const Footer = React.memo(FooterComponent);

Footer.displayName = 'Footer';
