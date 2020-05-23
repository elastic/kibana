/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlyoutHeader, EuiFlyoutBody, EuiFlyoutFooter } from '@elastic/eui';
import { getOr, isEmpty } from 'lodash/fp';
import React, { useState, useMemo } from 'react';
import styled from 'styled-components';

import { FlyoutHeaderWithCloseButton } from '../flyout/header_with_close_button';
import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { useKibana } from '../../lib/kibana';
import { ColumnHeaderOptions, KqlMode, EventType } from '../../store/timeline/model';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import { StatefulBody } from './body/stateful_body';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnDataProviderRemoved,
  OnDataProviderEdited,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from './events';
import { TimelineKqlFetch } from './fetch_kql_timeline';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header';
import { combineQueries } from './helpers';
import { TimelineRefetch } from './refetch_timeline';
import { ManageTimelineContext } from './timeline_context';
import {
  esQuery,
  Filter,
  FilterManager,
  IIndexPattern,
} from '../../../../../../src/plugins/data/public';

const TimelineContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const TimelineHeaderContainer = styled.div`
  margin-top: 6px;
  width: 100%;
`;

TimelineHeaderContainer.displayName = 'TimelineHeaderContainer';

const StyledEuiFlyoutHeader = styled(EuiFlyoutHeader)`
  align-items: center;
  box-shadow: none;
  display: flex;
  flex-direction: column;
  padding: 14px 10px 0 12px;
`;

const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  overflow-y: hidden;
  flex: 1;

  .euiFlyoutBody__overflow {
    overflow: hidden;
    mask-image: none;
  }

  .euiFlyoutBody__overflowContent {
    padding: 0 10px 0 12px;
    height: 100%;
    display: flex;
  }
`;

const StyledEuiFlyoutFooter = styled(EuiFlyoutFooter)`
  background: none;
  padding: 0 10px 5px 12px;
`;

export interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeaderOptions[];
  dataProviders: DataProvider[];
  end: number;
  eventType?: EventType;
  filters: Filter[];
  id: string;
  indexPattern: IIndexPattern;
  indexToAdd: string[];
  isLive: boolean;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: KqlMode;
  kqlQueryExpression: string;
  loadingIndexName: boolean;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onClose: () => void;
  onDataProviderEdited: OnDataProviderEdited;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
  showCallOutUnauthorizedMsg: boolean;
  start: number;
  sort: Sort;
  toggleColumn: (column: ColumnHeaderOptions) => void;
  usersViewing: string[];
}

/** The parent Timeline component */
export const TimelineComponent: React.FC<Props> = ({
  browserFields,
  columns,
  dataProviders,
  end,
  eventType,
  filters,
  id,
  indexPattern,
  indexToAdd,
  isLive,
  itemsPerPage,
  itemsPerPageOptions,
  kqlMode,
  kqlQueryExpression,
  loadingIndexName,
  onChangeDataProviderKqlQuery,
  onChangeDroppableAndProvider,
  onChangeItemsPerPage,
  onClose,
  onDataProviderEdited,
  onDataProviderRemoved,
  onToggleDataProviderEnabled,
  onToggleDataProviderExcluded,
  show,
  showCallOutUnauthorizedMsg,
  start,
  sort,
  toggleColumn,
  usersViewing,
}) => {
  const kibana = useKibana();
  const [filterManager] = useState<FilterManager>(new FilterManager(kibana.services.uiSettings));
  const combinedQueries = combineQueries({
    config: esQuery.getEsQueryConfig(kibana.services.uiSettings),
    dataProviders,
    indexPattern,
    browserFields,
    filters,
    kqlQuery: { query: kqlQueryExpression, language: 'kuery' },
    kqlMode,
    start,
    end,
  });
  const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
  const timelineQueryFields = useMemo(() => columnsHeader.map(c => c.id), [columnsHeader]);
  const timelineQuerySortField = useMemo(
    () => ({
      sortFieldId: sort.columnId,
      direction: sort.sortDirection as Direction,
    }),
    [sort.columnId, sort.sortDirection]
  );

  return (
    <TimelineContainer data-test-subj="timeline">
      <StyledEuiFlyoutHeader data-test-subj="eui-flyout-header" hasBorder={false}>
        <FlyoutHeaderWithCloseButton
          onClose={onClose}
          timelineId={id}
          usersViewing={usersViewing}
        />
        <TimelineHeaderContainer data-test-subj="timelineHeader">
          <TimelineHeader
            browserFields={browserFields}
            id={id}
            indexPattern={indexPattern}
            dataProviders={dataProviders}
            filterManager={filterManager}
            onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
            onChangeDroppableAndProvider={onChangeDroppableAndProvider}
            onDataProviderEdited={onDataProviderEdited}
            onDataProviderRemoved={onDataProviderRemoved}
            onToggleDataProviderEnabled={onToggleDataProviderEnabled}
            onToggleDataProviderExcluded={onToggleDataProviderExcluded}
            show={show}
            showCallOutUnauthorizedMsg={showCallOutUnauthorizedMsg}
          />
        </TimelineHeaderContainer>
      </StyledEuiFlyoutHeader>
      <TimelineKqlFetch id={id} indexPattern={indexPattern} inputId="timeline" />
      {combinedQueries != null ? (
        <TimelineQuery
          eventType={eventType}
          id={id}
          indexToAdd={indexToAdd}
          fields={timelineQueryFields}
          sourceId="default"
          limit={itemsPerPage}
          filterQuery={combinedQueries.filterQuery}
          sortField={timelineQuerySortField}
        >
          {({
            events,
            inspect,
            loading,
            totalCount,
            pageInfo,
            loadMore,
            getUpdatedAt,
            refetch,
          }) => (
            <ManageTimelineContext
              filterManager={filterManager}
              indexToAdd={indexToAdd}
              loading={loading || loadingIndexName}
              type={{ id }}
            >
              <TimelineRefetch
                id={id}
                inputId="timeline"
                inspect={inspect}
                loading={loading}
                refetch={refetch}
              />
              <StyledEuiFlyoutBody
                data-test-subj="eui-flyout-body"
                className="timeline-flyout-body"
              >
                <StatefulBody
                  browserFields={browserFields}
                  data={events}
                  id={id}
                  sort={sort}
                  toggleColumn={toggleColumn}
                />
              </StyledEuiFlyoutBody>
              <StyledEuiFlyoutFooter
                data-test-subj="eui-flyout-footer"
                className="timeline-flyout-footer"
              >
                <Footer
                  serverSideEventCount={totalCount}
                  hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                  height={footerHeight}
                  isLive={isLive}
                  isLoading={loading || loadingIndexName}
                  itemsCount={events.length}
                  itemsPerPage={itemsPerPage}
                  itemsPerPageOptions={itemsPerPageOptions}
                  onChangeItemsPerPage={onChangeItemsPerPage}
                  onLoadMore={loadMore}
                  nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                  tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)}
                  getUpdatedAt={getUpdatedAt}
                />
              </StyledEuiFlyoutFooter>
            </ManageTimelineContext>
          )}
        </TimelineQuery>
      ) : null}
    </TimelineContainer>
  );
};

export const Timeline = React.memo(TimelineComponent);
