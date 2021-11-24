/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiText,
  EuiPopoverProps,
  EuiPagination,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { EVENTS_COUNT_BUTTON_CLASS_NAME } from '../helpers';

import * as i18n from './translations';
import { OnChangePage } from '../types';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { LoadingPanel } from '../../loading';

export const isCompactFooter = (width: number): boolean => width < 600;

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
  flex: 0 0 auto;
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

const PopoverRowItems = styled(EuiPopover as unknown as FC)<
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
  itemsPerPage,
  onClick,
  serverSideEventCount,
}: {
  closePopover: () => void;
  documentType: string;
  isOpen: boolean;
  items: React.ReactElement[];
  itemsCount: number;
  itemsPerPage: number;
  onClick: () => void;
  serverSideEventCount: number;
  footerText: string | React.ReactNode;
}) => {
  const button = useMemo(
    () => (
      <EuiButtonEmpty
        className={EVENTS_COUNT_BUTTON_CLASS_NAME}
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={onClick}
        data-test-subj="local-events-count-button"
      >
        {i18n.ROWS_PER_PAGE(itemsPerPage)}
      </EuiButtonEmpty>
    ),
    [itemsPerPage, onClick]
  );

  return (
    <EuiPopover
      className="footer-popover"
      id="customizablePagination"
      data-test-subj="timelineSizeRowPopover"
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel items={items} data-test-subj="timelinePickSizeRow" />
    </EuiPopover>
  );
};

EventsCountComponent.displayName = 'EventsCountComponent';

export const EventsCount = React.memo(EventsCountComponent);

EventsCount.displayName = 'EventsCount';

interface PagingControlProps {
  activePage: number;
  isLoading: boolean;
  onPageClick: OnChangePage;
  totalCount: number;
  totalPages: number;
}

const TimelinePaginationContainer = styled.div<{ hideLastPage: boolean }>`
  ul.euiPagination__list {
    li.euiPagination__item:last-child {
      ${({ hideLastPage }) => `${hideLastPage ? 'display:none' : ''}`};
    }
  }
`;

export const PagingControlComponent: React.FC<PagingControlProps> = ({
  activePage,
  isLoading,
  onPageClick,
  totalCount,
  totalPages,
}) => {
  if (isLoading) {
    return <>{`${i18n.LOADING}...`}</>;
  }

  if (!totalPages) {
    return null;
  }

  return (
    <TimelinePaginationContainer hideLastPage={totalCount > 9999}>
      <EuiPagination
        data-test-subj="timeline-pagination"
        pageCount={totalPages}
        activePage={activePage}
        onPageClick={onPageClick}
      />
    </TimelinePaginationContainer>
  );
};

PagingControlComponent.displayName = 'PagingControlComponent';

export const PagingControl = React.memo(PagingControlComponent);

PagingControl.displayName = 'PagingControl';
interface FooterProps {
  activePage: number;
  height: number;
  id: string;
  isLive: boolean;
  isLoading: boolean;
  itemsCount: number;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  onChangePage: OnChangePage;
  totalCount: number;
}

/** Renders a loading indicator and paging controls */
export const FooterComponent = ({
  activePage,
  height,
  id,
  isLive,
  isLoading,
  itemsCount,
  itemsPerPage,
  itemsPerPageOptions,
  onChangePage,
  totalCount,
}: FooterProps) => {
  const dispatch = useDispatch();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);

  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const { documentType, loadingText, footerText } = useDeepEqualSelector((state) =>
    getManageTimeline(state, id)
  );

  const handleChangePageClick = useCallback(
    (nextPage: number) => {
      setPaginationLoading(true);
      onChangePage(nextPage);
    },
    [onChangePage]
  );

  const onButtonClick = useCallback(
    () => setIsPopoverOpen(!isPopoverOpen),
    [isPopoverOpen, setIsPopoverOpen]
  );

  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  const onChangeItemsPerPage = useCallback(
    (itemsChangedPerPage) =>
      dispatch(tGridActions.updateItemsPerPage({ id, itemsPerPage: itemsChangedPerPage })),
    [dispatch, id]
  );

  const rowItems = useMemo(
    () =>
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
      )),
    [closePopover, itemsPerPage, itemsPerPageOptions, onChangeItemsPerPage]
  );

  const totalPages = useMemo(
    () => Math.ceil(totalCount / itemsPerPage),
    [itemsPerPage, totalCount]
  );

  useEffect(() => {
    if (paginationLoading && !isLoading) {
      setPaginationLoading(false);
    }
  }, [isLoading, paginationLoading]);

  if (isLoading && !paginationLoading) {
    return (
      <LoadingPanelContainer>
        <LoadingPanel
          dataTestSubj="LoadingPanelTimeline"
          height="35px"
          showBorder={false}
          text={loadingText}
          width="100%"
        />
      </LoadingPanelContainer>
    );
  }

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
              itemsPerPage={itemsPerPage}
              onClick={onButtonClick}
              serverSideEventCount={totalCount}
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
                      id="xpack.timelines.footer.autoRefreshActiveTooltip"
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
              totalCount={totalCount}
              totalPages={totalPages}
              activePage={activePage}
              onPageClick={handleChangePageClick}
              isLoading={isLoading}
            />
          )}
        </EuiFlexItem>
      </FooterFlexGroup>
    </FooterContainer>
  );
};

FooterComponent.displayName = 'FooterComponent';

export const Footer = React.memo(FooterComponent);

Footer.displayName = 'Footer';
