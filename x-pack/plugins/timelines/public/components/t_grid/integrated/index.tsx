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
import { Direction, DocValueFields } from '../../../../common/search_strategy';
import { CoreStart } from '../../../../../../../src/core/public';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  CellValueElementProps,
  ColumnHeaderOptions,
  ControlColumnProps,
  DataProvider,
  RowRenderer,
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';
import {
  esQuery,
  Filter,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';
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
import { ExitFullScreen } from '../../exit_full_screen';
import { Sort } from '../body/sort';

export const EVENTS_VIEWER_HEADER_HEIGHT = 90; // px
const UTILITY_BAR_HEIGHT = 19; // px
const COMPACT_HEADER_HEIGHT = EVENTS_VIEWER_HEADER_HEIGHT - UTILITY_BAR_HEIGHT; // px

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

const TitleFlexGroup = styled(EuiFlexGroup)`
  margin-top: 8px;
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

export interface TGridIntegratedProps {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  deletedEventIds: Readonly<string[]>;
  docValueFields: DocValueFields[];
  end: string;
  filters: Filter[];
  globalFullScreen: boolean;
  headerFilterGroup?: React.ReactNode;
  height?: number;
  id: TimelineId;
  indexNames: string[];
  indexPattern: IIndexPattern;
  isLive: boolean;
  isLoadingIndexPattern: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: 'filter' | 'search';
  query: Query;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  setGlobalFullScreen: (fullscreen: boolean) => void;
  start: string;
  sort: Sort[];
  utilityBar?: (refetch: Refetch, totalCount: number) => React.ReactNode;
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId: string | undefined;
  leadingControlColumns: ControlColumnProps[];
  trailingControlColumns: ControlColumnProps[];
}

const TGridIntegratedComponent: React.FC<TGridIntegratedProps> = ({
  browserFields,
  columns,
  dataProviders,
  deletedEventIds,
  docValueFields,
  end,
  filters,
  globalFullScreen,
  headerFilterGroup,
  id,
  indexNames,
  indexPattern,
  isLive,
  isLoadingIndexPattern,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  onRuleChange,
  query,
  renderCellValue,
  rowRenderers,
  setGlobalFullScreen,
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

  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const { queryFields, title, unit } = useDeepEqualSelector((state) =>
    getManageTimeline(state, id ?? '')
  );

  useEffect(() => {
    dispatch(tGridActions.setTGridIsLoading({ id, isTGridLoading: isQueryLoading }));
  }, [dispatch, id, isQueryLoading]);

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);
  const titleWithExitFullScreen = useMemo(
    () => (
      <TitleFlexGroup alignItems="center" data-test-subj="title-flex-group" gutterSize="none">
        <EuiFlexItem grow={false}>{justTitle}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExitFullScreen fullScreen={globalFullScreen} setFullScreen={setGlobalFullScreen} />
        </EuiFlexItem>
      </TitleFlexGroup>
    ),
    [globalFullScreen, justTitle, setGlobalFullScreen]
  );

  const combinedQueries = combineQueries({
    config: esQuery.getEsQueryConfig(uiSettings),
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery: query,
    kqlMode,
    isEventViewer: true,
  });

  const canQueryTimeline = useMemo(
    () =>
      combinedQueries != null &&
      isLoadingIndexPattern != null &&
      !isLoadingIndexPattern &&
      !isEmpty(start) &&
      !isEmpty(end),
    [isLoadingIndexPattern, combinedQueries, start, end]
  );

  const fields = useMemo(() => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])], [
    columnsHeader,
    queryFields,
  ]);

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
    docValueFields,
    fields,
    filterQuery: combinedQueries!.filterQuery,
    id,
    indexNames,
    limit: itemsPerPage,
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

  return (
    <StyledEuiPanel
      data-test-subj="events-viewer-panel"
      $isFullScreen={globalFullScreen && id !== TimelineId.active}
    >
      {canQueryTimeline ? (
        <>
          <HeaderSection
            id={!resolverIsShowing(graphEventId) ? id : undefined}
            height={headerFilterGroup ? COMPACT_HEADER_HEIGHT : EVENTS_VIEWER_HEADER_HEIGHT}
            subtitle={utilityBar ? undefined : subtitle}
            title={globalFullScreen ? titleWithExitFullScreen : justTitle}
          >
            {HeaderSectionContent}
          </HeaderSection>
          {utilityBar && !resolverIsShowing(graphEventId) && (
            <UtilityBar>{utilityBar?.(refetch, totalCountMinusDeleted)}</UtilityBar>
          )}
          <EventsContainerLoading
            data-timeline-id={id}
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
                  browserFields={browserFields}
                  data={nonDeletedEvents}
                  id={id}
                  isEventViewer={true}
                  onRuleChange={onRuleChange}
                  // refetch={refetch}
                  renderCellValue={renderCellValue}
                  rowRenderers={rowRenderers}
                  sort={sort}
                  tabType={TimelineTabs.query}
                  totalPages={calculateTotalPages({
                    itemsCount: totalCountMinusDeleted,
                    itemsPerPage,
                  })}
                  leadingControlColumns={leadingControlColumns}
                  trailingControlColumns={trailingControlColumns}
                />
                <Footer
                  activePage={pageInfo.activePage}
                  data-test-subj="events-viewer-footer"
                  updatedAt={updatedAt}
                  height={footerHeight}
                  id={id}
                  isLive={isLive}
                  isLoading={loading}
                  itemsCount={nonDeletedEvents.length}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={itemsPerPageOptions}
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

export const TGridIntegrated = React.memo(TGridIntegratedComponent);
