/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { getOr, isEmpty, union } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { Direction } from '../../../../common/search_strategy';
import { BrowserFields, DocValueFields } from '../../containers/source';
import { useTimelineEvents } from '../../../timelines/containers';
import { useKibana } from '../../lib/kibana';
import { ColumnHeaderOptions, KqlMode } from '../../../timelines/store/timeline/model';
import { HeaderSection } from '../header_section';
import { defaultHeaders } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { Sort } from '../../../timelines/components/timeline/body/sort';
import { StatefulBody } from '../../../timelines/components/timeline/body/stateful_body';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { OnChangeItemsPerPage } from '../../../timelines/components/timeline/events';
import { Footer, footerHeight } from '../../../timelines/components/timeline/footer';
import { combineQueries, resolverIsShowing } from '../../../timelines/components/timeline/helpers';
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
import { useManageTimeline } from '../../../timelines/components/manage_timeline';
import { ExitFullScreen } from '../exit_full_screen';
import { useFullScreen } from '../../containers/use_full_screen';
import { TimelineId } from '../../../../common/types/timeline';

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

const EventsContainerLoading = styled.div`
  width: 100%;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
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
  height?: number;
  id: string;
  indexNames: string[];
  indexPattern: IIndexPattern;
  isLive: boolean;
  isLoadingIndexPattern: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  query: Query;
  start: string;
  sort: Sort;
  toggleColumn: (column: ColumnHeaderOptions) => void;
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
  onChangeItemsPerPage,
  query,
  start,
  sort,
  toggleColumn,
  utilityBar,
  graphEventId,
}) => {
  const { globalFullScreen } = useFullScreen();
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const kibana = useKibana();
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  const { getManageTimelineById, setIsTimelineLoading } = useManageTimeline();

  useEffect(() => {
    setIsTimelineLoading({ id, isLoading: isQueryLoading });
  }, [id, isQueryLoading, setIsTimelineLoading]);

  const { queryFields, title, unit } = useMemo(() => getManageTimelineById(id), [
    getManageTimelineById,
    id,
  ]);

  const justTitle = useMemo(() => <TitleText data-test-subj="title">{title}</TitleText>, [title]);

  const titleWithExitFullScreen = useMemo(
    () => (
      <TitleFlexGroup alignItems="center" data-test-subj="title-flex-group" gutterSize="none">
        <EuiFlexItem grow={false}>{justTitle}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ExitFullScreen />
        </EuiFlexItem>
      </TitleFlexGroup>
    ),
    [justTitle]
  );

  const combinedQueries = combineQueries({
    config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery: query,
    kqlMode,
    start,
    end,
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
    () =>
      union(
        columnsHeader.map((c) => c.id),
        queryFields ?? []
      ),
    [columnsHeader, queryFields]
  );

  const sortField = useMemo(
    () => ({
      field: sort.columnId,
      direction: sort.sortDirection as Direction,
    }),
    [sort.columnId, sort.sortDirection]
  );

  const [
    loading,
    { events, updatedAt, inspect, loadPage, pageInfo, refetch, totalCount = 0 },
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
      `${i18n.SHOWING}: ${totalCountMinusDeleted.toLocaleString()} ${unit(totalCountMinusDeleted)}`,
    [totalCountMinusDeleted, unit]
  );

  const nonDeletedEvents = useMemo(() => events.filter((e) => !deletedEventIds.includes(e._id)), [
    deletedEventIds,
    events,
  ]);

  useEffect(() => {
    setIsQueryLoading(loading);
  }, [loading]);

  return (
    <StyledEuiPanel
      data-test-subj="events-viewer-panel"
      $isFullScreen={globalFullScreen && id !== TimelineId.active}
    >
      {canQueryTimeline ? (
        <EventDetailsWidthProvider>
          <>
            <HeaderSection
              id={!resolverIsShowing(graphEventId) ? id : undefined}
              height={headerFilterGroup ? COMPACT_HEADER_HEIGHT : EVENTS_VIEWER_HEADER_HEIGHT}
              subtitle={utilityBar ? undefined : subtitle}
              title={inspect ? justTitle : titleWithExitFullScreen}
            >
              {headerFilterGroup && (
                <HeaderFilterGroupWrapper
                  data-test-subj="header-filter-group-wrapper"
                  show={!resolverIsShowing(graphEventId)}
                >
                  {headerFilterGroup}
                </HeaderFilterGroupWrapper>
              )}
            </HeaderSection>
            {utilityBar && !resolverIsShowing(graphEventId) && (
              <UtilityBar>{utilityBar?.(refetch, totalCountMinusDeleted)}</UtilityBar>
            )}
            <EventsContainerLoading data-test-subj={`events-container-loading-${loading}`}>
              <TimelineRefetch
                id={id}
                inputId="global"
                inspect={inspect}
                loading={loading}
                refetch={refetch}
              />

              <StatefulBody
                browserFields={browserFields}
                data={nonDeletedEvents}
                docValueFields={docValueFields}
                id={id}
                isEventViewer={true}
                refetch={refetch}
                sort={sort}
                toggleColumn={toggleColumn}
              />

              {
                /** Hide the footer if Resolver is showing. */
                !graphEventId && (
                  <Footer
                    activePage={getOr(0, 'activePage', pageInfo)}
                    data-test-subj="events-viewer-footer"
                    updatedAt={updatedAt}
                    height={footerHeight}
                    id={id}
                    isLive={isLive}
                    isLoading={loading}
                    itemsCount={nonDeletedEvents.length}
                    itemsPerPage={itemsPerPage}
                    itemsPerPageOptions={itemsPerPageOptions}
                    onChangeItemsPerPage={onChangeItemsPerPage}
                    onChangePage={loadPage}
                    serverSideEventCount={totalCountMinusDeleted}
                    totalPages={getOr(0, 'totalPages', pageInfo)}
                  />
                )
              }
            </EventsContainerLoading>
          </>
        </EventDetailsWidthProvider>
      ) : null}
    </StyledEuiPanel>
  );
};

export const EventsViewer = React.memo(
  EventsViewerComponent,
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
    prevProps.start === nextProps.start &&
    prevProps.sort === nextProps.sort &&
    prevProps.utilityBar === nextProps.utilityBar &&
    prevProps.graphEventId === nextProps.graphEventId
);
