/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import { getOr, isEmpty, union } from 'lodash/fp';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import deepEqual from 'fast-deep-equal';

import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../../timelines/containers';
import { Direction } from '../../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { ColumnHeaderOptions, KqlMode } from '../../../timelines/store/timeline/model';
import { HeaderSection } from '../header_section';
import { defaultHeaders } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import { Sort } from '../../../timelines/components/timeline/body/sort';
import { StatefulBody } from '../../../timelines/components/timeline/body/stateful_body';
import { DataProvider } from '../../../timelines/components/timeline/data_providers/data_provider';
import { OnChangeItemsPerPage } from '../../../timelines/components/timeline/events';
import { Footer, footerHeight } from '../../../timelines/components/timeline/footer';
import { combineQueries } from '../../../timelines/components/timeline/helpers';
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
  toggleColumn,
  utilityBar,
}) => {
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const kibana = useKibana();
  const [isQueryLoading, setIsQueryLoading] = useState(false);

  const { getManageTimelineById, setIsTimelineLoading } = useManageTimeline();

  useEffect(() => {
    setIsTimelineLoading({ id, isLoading: isQueryLoading });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQueryLoading]);

  const { queryFields, title, unit } = useMemo(() => getManageTimelineById(id), [
    getManageTimelineById,
    id,
  ]);

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
            fields={fields}
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
              setIsQueryLoading(loading);
              const totalCountMinusDeleted =
                totalCount > 0 ? totalCount - deletedEventIds.length : 0;

              const subtitle = `${i18n.SHOWING}: ${totalCountMinusDeleted.toLocaleString()} ${unit(
                totalCountMinusDeleted
              )}`;

              return (
                <>
                  <HeaderSection id={id} subtitle={utilityBar ? undefined : subtitle} title={title}>
                    {headerFilterGroup}
                  </HeaderSection>
                  {utilityBar?.(refetch, totalCountMinusDeleted)}
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
                      data={events.filter((e) => !deletedEventIds.includes(e._id))}
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
                      id={id}
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
    prevProps.utilityBar === nextProps.utilityBar
);
