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
import deepEqual from 'fast-deep-equal';

import { useDispatch } from 'react-redux';
import { Direction } from '../../../../common/search_strategy';
import { BrowserFields, DocValueFields } from '../../containers/source';
import { useTimelineEvents } from '../../../timelines/containers';
import { useKibana } from '../../lib/kibana';
import { KqlMode } from '../../../timelines/store/timeline/model';
import { HeaderSection } from '../header_section';
import { defaultHeaders } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { Sort } from '../../../timelines/components/timeline/body/sort';
import { StatefulBody } from '../../../timelines/components/timeline/body';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { Footer, footerHeight } from '../../../timelines/components/timeline/footer';
import {
  calculateTotalPages,
  combineQueries,
  resolverIsShowing,
} from '../../../timelines/components/timeline/helpers';
import { TimelineRefetch } from '../../../timelines/components/timeline/refetch_timeline';
import { EventDetailsWidthProvider } from './event_details_width_context';
import * as i18n from './translations';
import {
  Filter,
  esQuery,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/public';
import { inputsModel } from '../../store';
import { ExitFullScreen } from '../exit_full_screen';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import {
  ColumnHeaderOptions,
  ControlColumnProps,
  RowRenderer,
  TimelineId,
  TimelineTabs,
} from '../../../../common/types/timeline';
import { GraphOverlay } from '../../../timelines/components/graph_overlay';
import { CellValueElementProps } from '../../../timelines/components/timeline/cell_rendering';
import { SELECTOR_TIMELINE_GLOBAL_CONTAINER } from '../../../timelines/components/timeline/styles';
import { timelineSelectors, timelineActions } from '../../../timelines/store/timeline';
import { useDeepEqualSelector } from '../../hooks/use_selector';
import { defaultControlColumn } from '../../../timelines/components/timeline/body/control_columns';
import { TimelineContext } from '../../../../../timelines/public';

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

interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  deletedEventIds: Readonly<string[]>;
  docValueFields: DocValueFields[];
  end: string;
  filters: Filter[];
  headerFilterGroup?: React.ReactNode;
  id: TimelineId;
  indexNames: string[];
  indexPattern: IIndexPattern;
  isLive: boolean;
  isLoadingIndexPattern: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  query: Query;
  onRuleChange?: () => void;
  renderCellValue: (props: CellValueElementProps) => React.ReactNode;
  rowRenderers: RowRenderer[];
  start: string;
  sort: Sort[];
  showTotalCount?: boolean;
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
  // If truthy, the graph viewer (Resolver) is showing
  graphEventId: string | undefined;
}

const EventsViewerComponent: React.FC<Props> = ({
  browserFields,
  columns,
  dataProviders,
  deletedEventIds,
  docValueFields,
  end,
  filters,
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
  start,
  sort,
  showTotalCount = true,
  utilityBar,
  graphEventId,
}) => {
  const dispatch = useDispatch();
  const { globalFullScreen, setGlobalFullScreen } = useGlobalFullScreen();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const kibana = useKibana();
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  useEffect(() => {
    dispatch(timelineActions.updateIsLoading({ id, isLoading: isQueryLoading }));
  }, [dispatch, id, isQueryLoading]);

  const getManageTimeline = useMemo(() => timelineSelectors.getManageTimelineById(), []);
  const unit = useMemo(() => (n: number) => i18n.UNIT(n), []);
  const { queryFields, title } = useDeepEqualSelector((state) => getManageTimeline(state, id));

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
    config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
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

  const fields = useMemo(
    () => [...columnsHeader.map((c) => c.id), ...(queryFields ?? [])],
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

  const [loading, { events, updatedAt, inspect, loadPage, pageInfo, refetch, totalCount = 0 }] =
    useTimelineEvents({
      docValueFields,
      fields,
      filterQuery: combinedQueries!.filterQuery,
      id,
      indexNames,
      limit: itemsPerPage,
      sort: sortField,
      startDate: start,
      endDate: end,
      skip: !canQueryTimeline || combinedQueries?.filterQuery === undefined, // When the filterQuery comes back as undefined, it means an error has been thrown and the request should be skipped
    });

  const totalCountMinusDeleted = useMemo(
    () => (totalCount > 0 ? totalCount - deletedEventIds.length : 0),
    [deletedEventIds.length, totalCount]
  );

  const subtitle = useMemo(
    () =>
      showTotalCount
        ? `${i18n.SHOWING}: ${totalCountMinusDeleted.toLocaleString()} ${unit(
            totalCountMinusDeleted
          )}`
        : null,
    [showTotalCount, totalCountMinusDeleted, unit]
  );

  const nonDeletedEvents = useMemo(
    () => events.filter((e) => !deletedEventIds.includes(e._id)),
    [deletedEventIds, events]
  );

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
    [graphEventId, headerFilterGroup]
  );

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  const leadingControlColumns: ControlColumnProps[] = [defaultControlColumn];
  const trailingControlColumns: ControlColumnProps[] = [];
  const timelineContext = useMemo(() => ({ timelineId: id }), [id]);
  return (
    <StyledEuiPanel
      data-test-subj="events-viewer-panel"
      $isFullScreen={globalFullScreen && id !== TimelineId.active}
      hasBorder
    >
      {canQueryTimeline ? (
        <EventDetailsWidthProvider>
          <>
            <HeaderSection
              id={!resolverIsShowing(graphEventId) ? id : undefined}
              height={headerFilterGroup ? COMPACT_HEADER_HEIGHT : EVENTS_VIEWER_HEADER_HEIGHT}
              subtitle={utilityBar ? undefined : subtitle}
              title={globalFullScreen ? titleWithExitFullScreen : justTitle}
              isInspectDisabled={combinedQueries!.filterQuery === undefined}
            >
              {HeaderSectionContent}
            </HeaderSection>
            {utilityBar && !resolverIsShowing(graphEventId) && (
              <UtilityBar>{utilityBar?.(refetch, totalCountMinusDeleted)}</UtilityBar>
            )}
            <TimelineContext.Provider value={timelineContext}>
              <EventsContainerLoading
                data-timeline-id={id}
                data-test-subj={`events-container-loading-${loading}`}
              >
                <TimelineRefetch
                  id={id}
                  inputId="global"
                  inspect={inspect}
                  loading={loading}
                  refetch={refetch}
                />

                {graphEventId && <GraphOverlay timelineId={id} />}
                <FullWidthFlexGroup $visible={!graphEventId} gutterSize="none">
                  <ScrollableFlexItem grow={1}>
                    <StatefulBody
                      activePage={pageInfo.activePage}
                      browserFields={browserFields}
                      data={nonDeletedEvents}
                      id={id}
                      isEventViewer={true}
                      onRuleChange={onRuleChange}
                      refetch={refetch}
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
            </TimelineContext.Provider>
          </>
        </EventDetailsWidthProvider>
      ) : null}
    </StyledEuiPanel>
  );
};

export const EventsViewer = React.memo(
  EventsViewerComponent,
  // eslint-disable-next-line complexity
  (prevProps, nextProps) =>
    deepEqual(prevProps.browserFields, nextProps.browserFields) &&
    prevProps.columns === nextProps.columns &&
    deepEqual(prevProps.docValueFields, nextProps.docValueFields) &&
    prevProps.dataProviders === nextProps.dataProviders &&
    prevProps.deletedEventIds === nextProps.deletedEventIds &&
    prevProps.end === nextProps.end &&
    deepEqual(prevProps.filters, nextProps.filters) &&
    prevProps.headerFilterGroup === nextProps.headerFilterGroup &&
    prevProps.id === nextProps.id &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    prevProps.itemsPerPageOptions === nextProps.itemsPerPageOptions &&
    prevProps.kqlMode === nextProps.kqlMode &&
    deepEqual(prevProps.query, nextProps.query) &&
    prevProps.renderCellValue === nextProps.renderCellValue &&
    prevProps.rowRenderers === nextProps.rowRenderers &&
    prevProps.start === nextProps.start &&
    deepEqual(prevProps.sort, nextProps.sort) &&
    prevProps.utilityBar === nextProps.utilityBar &&
    prevProps.graphEventId === nextProps.graphEventId
);
