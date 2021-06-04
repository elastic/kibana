/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { Direction } from '../../../../common/search_strategy';
import { CoreStart } from '../../../../../../../src/core/public';
import {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  DataProvider,
  RowRenderer,
  SortColumnTimeline,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { esQuery, Filter, Query } from '../../../../../../../src/plugins/data/public';
import { useDeepEqualSelector } from '../../../hooks/use_selector';
import { Refetch } from '../../../store/t_grid/inputs';
import { defaultHeaders } from '../body/column_headers/default_headers';
import { calculateTotalPages, combineQueries, resolverIsShowing } from '../helpers';
import { tGridActions, tGridSelectors } from '../../../store/t_grid';
import { useTimelineEvents } from '../../../container';
import { HeaderSection } from '../header_section';
import { StatefulBody } from '../body';
import { Footer, footerHeight } from '../footer';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from '../styles';
import * as i18n from './translations';

export const EVENTS_VIEWER_HEADER_HEIGHT = 90; // px
const UTILITY_BAR_HEIGHT = 19; // px
const COMPACT_HEADER_HEIGHT = EVENTS_VIEWER_HEADER_HEIGHT - UTILITY_BAR_HEIGHT; // px
const STANDALONE_ID = 'standalone-t-grid';
const EMPTY_BROWSER_FIELDS = {};
const EMPTY_INDEX_PATTERN = { title: '', fields: [] };
const EMPTY_DATA_PROVIDERS: DataProvider[] = [];

const UtilityBar = styled.div`
  height: ${UTILITY_BAR_HEIGHT}px;
`;

const TitleText = styled.span`
  margin-right: 12px;
`;

const StyledEuiPanel = styled(EuiPanel)<{ $isFullScreen: boolean }>`
  display: flex;
  flex-direction: column;

  ${({ $isFullScreen }) =>
    $isFullScreen &&
    `
      border: 0;
      box-shadow: none;
      padding-top: 0;
      padding-bottom: 0;
  `}
`;

const EventsContainerLoading = styled.div.attrs(({ className = '' }) => ({
  className: `${SELECTOR_TIMELINE_GLOBAL_CONTAINER} ${className}`,
}))`
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const FullWidthFlexGroup = styled(EuiFlexGroup)<{ $visible: boolean }>`
  overflow: hidden;
  margin: 0;
  display: ${({ $visible }) => ($visible ? 'flex' : 'none')};
`;

const ScrollableFlexItem = styled(EuiFlexItem)`
  overflow: auto;
`;

/**
 * Hides stateful headerFilterGroup implementations, but prevents the component
 * from being unmounted, to preserve the state of the component
 */
const HeaderFilterGroupWrapper = styled.header<{ show: boolean }>`
  ${({ show }) => (show ? '' : 'visibility: hidden;')}
`;

export interface TGridStandaloneProps {
  columns: ColumnHeaderOptions[];
  deletedEventIds: Readonly<string[]>;
  end: string;
  filters: Filter[];
  headerFilterGroup?: React.ReactNode;
  height?: number;
  indexNames: string[];
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  query: Query;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  start: string;
  sort: SortColumnTimeline[];
  utilityBar?: (refetch: Refetch, totalCount: number) => React.ReactNode;
  graphEventId?: string;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

const TGridStandaloneComponent: React.FC<TGridStandaloneProps> = ({
  columns,
  deletedEventIds,
  end,
  filters,
  headerFilterGroup,
  indexNames,
  itemsPerPage,
  itemsPerPageOptions,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  start,
  sort,
  utilityBar,
  graphEventId,
  leadingControlColumns,
  trailingControlColumns,
}) => {
  const dispatch = useDispatch();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const { uiSettings } = useKibana<CoreStart>().services;
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  const getTGrid = useMemo(() => tGridSelectors.getTGridByIdSelector(), []);
  const {
    itemsPerPage: itemsPerPageStore,
    itemsPerPageOptions: itemsPerPageOptionsStore,
    queryFields,
    title,
    unit,
  } = useDeepEqualSelector((state) => getTGrid(state, STANDALONE_ID ?? ''));

  useEffect(() => {
    dispatch(tGridActions.setTGridIsLoading({ id: STANDALONE_ID, isTGridLoading: isQueryLoading }));
  }, [dispatch, isQueryLoading]);

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const combinedQueries = combineQueries({
    config: esQuery.getEsQueryConfig(uiSettings),
    dataProviders: EMPTY_DATA_PROVIDERS,
    indexPattern: EMPTY_INDEX_PATTERN,
    browserFields: EMPTY_BROWSER_FIELDS,
    filters,
    kqlQuery: query,
    kqlMode: 'search',
    isEventViewer: true,
  });

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      // isLoadingIndexPattern != null &&
      // !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [combinedQueries, start, end]
  );

  const fields = useMemo(
    () => [
      ...columnsHeader.reduce<string[]>(
        (acc, c) => (c.linkField != null ? [...acc, c.id, c.linkField] : [...acc, c.id]),
        []
      ),
      ...(queryFields ?? []),
    ],
    [columnsHeader, queryFields]
  );

  const sortField = useMemo(
    () =>
      sort.map(({ columnId, columnType, sortDirection }) => ({
        field: columnId,
        type: columnType,
        direction: sortDirection as Direction,
      })),
    [sort]
  );

  const [
    loading,
    { events, updatedAt, loadPage, pageInfo, refetch, totalCount = 0 },
  ] = useTimelineEvents({
    docValueFields: [],
    excludeEcsData: true,
    fields,
    filterQuery: combinedQueries!.filterQuery,
    id: STANDALONE_ID,
    indexNames,
    limit: itemsPerPageStore,
    sort: sortField,
    startDate: start,
    endDate: end,
    skip: !canQueryTimeline,
  });

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const subtitle = useMemo(
    () =>
      `${i18n.SHOWING}: ${totalCountMinusDeleted.toLocaleString()} ${
        unit && unit(totalCountMinusDeleted)
      }`,
    [totalCountMinusDeleted, unit]
  );

  const nonDeletedEvents = useMemo(() => events.filter((e) => !deletedEventIds.includes(e._id)), [
    deletedEventIds,
    events,
  ]);

  const HeaderSectionContent = useMemo(
    () =>
      headerFilterGroup && (
        <HeaderFilterGroupWrapper
          data-test-subj="header-filter-group-wrapper"
          show={!resolverIsShowing(graphEventId)}
        >
          {headerFilterGroup}
        </HeaderFilterGroupWrapper>
      ),
    [headerFilterGroup, graphEventId]
  );

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  useEffect(() => {
    dispatch(
      tGridActions.createTGrid({
        id: STANDALONE_ID,
        columns,
        dateRange: {
          start,
          end,
        },
        excludedRowRendererIds: [],
        indexNames,
        sort,
        itemsPerPage,
        itemsPerPageOptions,
        showCheckboxes: false,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StyledEuiPanel data-test-subj="events-viewer-panel" $isFullScreen={false}>
      {canQueryTimeline ? (
        <>
          <HeaderSection
            id={!resolverIsShowing(graphEventId) ? STANDALONE_ID : undefined}
            height={headerFilterGroup ? COMPACT_HEADER_HEIGHT : EVENTS_VIEWER_HEADER_HEIGHT}
            subtitle={utilityBar ? undefined : subtitle}
            title={justTitle}
            // title={globalFullScreen ? titleWithExitFullScreen : justTitle}
          >
            {HeaderSectionContent}
          </HeaderSection>
          {utilityBar && !resolverIsShowing(graphEventId) && (
            <UtilityBar>{utilityBar?.(refetch, totalCountMinusDeleted)}</UtilityBar>
          )}
          <EventsContainerLoading
            data-timeline-id={STANDALONE_ID}
            data-test-subj={`events-container-loading-${loading}`}
          >
            {/* <TimelineRefetch
                id={id}
                inputId="global"
                inspect={inspect}
                loading={loading}
                refetch={refetch}
              /> */}

            {/* {graphEventId && <GraphOverlay isEventViewer={true} timelineId={id} />} */}
            <FullWidthFlexGroup $visible={!graphEventId} gutterSize="none">
              <ScrollableFlexItem grow={1}>
                <StatefulBody
                  activePage={pageInfo.activePage}
                  browserFields={EMPTY_BROWSER_FIELDS}
                  data={nonDeletedEvents}
                  id={STANDALONE_ID}
                  isEventViewer={true}
                  onRuleChange={onRuleChange}
                  // refetch={refetch}
                  renderCellValue={renderCellValue}
                  rowRenderers={rowRenderers}
                  sort={sort}
                  tabType={TimelineTabs.query}
                  totalPages={calculateTotalPages({
                    itemsCount: totalCountMinusDeleted,
                    itemsPerPage: itemsPerPageStore,
                  })}
                  leadingControlColumns={leadingControlColumns}
                  trailingControlColumns={trailingControlColumns}
                />
                <Footer
                  activePage={pageInfo.activePage}
                  data-test-subj="events-viewer-footer"
                  updatedAt={updatedAt}
                  height={footerHeight}
                  id={STANDALONE_ID}
                  isLive={false}
                  isLoading={loading}
                  itemsCount={nonDeletedEvents.length}
                  itemsPerPage={itemsPerPageStore}
                  itemsPerPageOptions={itemsPerPageOptionsStore}
                  onChangePage={loadPage}
                  totalCount={totalCountMinusDeleted}
                />
              </ScrollableFlexItem>
            </FullWidthFlexGroup>
          </EventsContainerLoading>
        </>
      ) : null}
    </StyledEuiPanel>
  );
};

export const TGridStandalone = React.memo(TGridStandaloneComponent);
