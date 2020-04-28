/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { getOr, isEmpty, union } from 'lodash/fp';
import React, { useMemo } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { ColumnHeaderOptions, KqlMode } from '../../store/timeline/model';
import { HeaderSection } from '../header_section';
import { defaultHeaders } from '../timeline/body/column_headers/default_headers';
import { Sort } from '../timeline/body/sort';
import { StatefulBody } from '../timeline/body/stateful_body';
import { DataProvider } from '../timeline/data_providers/data_provider';
import { OnChangeItemsPerPage } from '../timeline/events';
import { Footer, footerHeight } from '../timeline/footer';
import { combineQueries } from '../timeline/helpers';
import { TimelineRefetch } from '../timeline/refetch_timeline';
import { ManageTimelineContext, TimelineTypeContextProps } from '../timeline/timeline_context';
import { EventDetailsWidthProvider } from './event_details_width_context';
import * as i18n from './translations';
import { Filter, esQuery, IIndexPattern, Query } from '../../../../../../src/plugins/data/public';
import { inputsModel } from '../../store';

const DEFAULT_EVENTS_VIEWER_HEIGHT = 500;

const StyledEuiPanel = styled(EuiPanel)`
  max-width: 100%;
`;

const EventsContainerLoading = styled.div`
  width: 100%;
  overflow: auto;
`;

interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  deletedEventIds: Readonly<string[]>;
  end: number;
  filters: Filter[];
  headerFilterGroup?: React.ReactNode;
  height?: number;
  id: string;
  indexPattern: IIndexPattern;
  isLive: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  query: Query;
  start: number;
  sort: Sort;
  timelineTypeContext: TimelineTypeContextProps;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  utilityBar?: (refetch: inputsModel.Refetch, totalCount: number) => React.ReactNode;
}

const EventsViewerComponent: React.FC<Props> = ({
  browserFields,
  columns,
  dataProviders,
  deletedEventIds,
  end,
  filters,
  headerFilterGroup,
  height = DEFAULT_EVENTS_VIEWER_HEIGHT,
  id,
  indexPattern,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  onChangeItemsPerPage,
  query,
  start,
  sort,
  timelineTypeContext,
  toggleColumn,
  utilityBar,
}) => {
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const kibana = useKibana();
  const { filterManager } = useKibana().services.data.query;
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
  const queryFields = useMemo(
    () =>
      union(
        columnsHeader.map(c => c.id),
        timelineTypeContext.queryFields ?? []
      ),
    [columnsHeader, timelineTypeContext.queryFields]
  );
  const sortField = useMemo(
    () => ({
      sortFieldId: sort.columnId,
      direction: sort.sortDirection as Direction,
    }),
    [sort.columnId, sort.sortDirection]
  );

  return (
    <StyledEuiPanel data-test-subj="events-viewer-panel">
      {combinedQueries != null ? (
        <EventDetailsWidthProvider>
          <TimelineQuery
            fields={queryFields}
            filterQuery={combinedQueries.filterQuery}
            id={id}
            indexPattern={indexPattern}
            limit={itemsPerPage}
            sortField={sortField}
            sourceId="default"
          >
            {({
              events,
              getUpdatedAt,
              inspect,
              loading,
              loadMore,
              pageInfo,
              refetch,
              totalCount = 0,
            }) => {
              const totalCountMinusDeleted =
                totalCount > 0 ? totalCount - deletedEventIds.length : 0;

              const subtitle = `${
                i18n.SHOWING
              }: ${totalCountMinusDeleted.toLocaleString()} ${timelineTypeContext.unit?.(
                totalCountMinusDeleted
              ) ?? i18n.UNIT(totalCountMinusDeleted)}`;

              return (
                <>
                  <HeaderSection
                    id={id}
                    subtitle={utilityBar ? undefined : subtitle}
                    title={timelineTypeContext?.title ?? i18n.EVENTS}
                  >
                    {headerFilterGroup}
                  </HeaderSection>

                  {utilityBar?.(refetch, totalCountMinusDeleted)}

                  <EventsContainerLoading data-test-subj={`events-container-loading-${loading}`}>
                    <ManageTimelineContext
                      filterManager={filterManager}
                      loading={loading}
                      type={timelineTypeContext}
                    >
                      <TimelineRefetch
                        id={id}
                        inputId="global"
                        inspect={inspect}
                        loading={loading}
                        refetch={refetch}
                      />

                      <StatefulBody
                        browserFields={browserFields}
                        data={events.filter(e => !deletedEventIds.includes(e._id))}
                        id={id}
                        isEventViewer={true}
                        height={height}
                        sort={sort}
                        toggleColumn={toggleColumn}
                      />

                      <Footer
                        getUpdatedAt={getUpdatedAt}
                        hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                        height={footerHeight}
                        isLive={isLive}
                        isLoading={loading}
                        itemsCount={events.length}
                        itemsPerPage={itemsPerPage}
                        itemsPerPageOptions={itemsPerPageOptions}
                        onChangeItemsPerPage={onChangeItemsPerPage}
                        onLoadMore={loadMore}
                        nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                        serverSideEventCount={totalCountMinusDeleted}
                        tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                      />
                    </ManageTimelineContext>
                  </EventsContainerLoading>
                </>
              );
            }}
          </TimelineQuery>
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
    prevProps.dataProviders === nextProps.dataProviders &&
    prevProps.deletedEventIds === nextProps.deletedEventIds &&
    prevProps.end === nextProps.end &&
    deepEqual(prevProps.filters, nextProps.filters) &&
    prevProps.height === nextProps.height &&
    prevProps.id === nextProps.id &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
    prevProps.isLive === nextProps.isLive &&
    prevProps.itemsPerPage === nextProps.itemsPerPage &&
    prevProps.itemsPerPageOptions === nextProps.itemsPerPageOptions &&
    prevProps.kqlMode === nextProps.kqlMode &&
    deepEqual(prevProps.query, nextProps.query) &&
    prevProps.start === nextProps.start &&
    prevProps.sort === nextProps.sort &&
    deepEqual(prevProps.timelineTypeContext, nextProps.timelineTypeContext) &&
    prevProps.utilityBar === nextProps.utilityBar
);
