/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { getOr, isEmpty } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { StaticIndexPattern } from 'ui/index_patterns';

import { BrowserFields } from '../../containers/source';
import { TimelineQuery } from '../../containers/timeline';
import { Direction } from '../../graphql/types';
import { timelineModel } from '../../store';
import { AutoSizer } from '../auto_sizer';

import { ColumnHeader } from './body/column_headers/column_header';
import { defaultHeaders } from './body/column_headers/default_headers';
import { Sort } from './body/sort';
import { StatefulBody } from './body/stateful_body';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeDataProviderKqlQuery,
  OnChangeDroppableAndProvider,
  OnChangeItemsPerPage,
  OnDataProviderRemoved,
  OnToggleDataProviderEnabled,
  OnToggleDataProviderExcluded,
} from './events';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header';
import { calculateBodyHeight, combineQueries } from './helpers';

const WrappedByAutoSizer = styled.div`
  width: 100%;
`; // required by AutoSizer

const TimelineContainer = styled(EuiFlexGroup)`
  min-height: 500px;
  overflow: hidden;
  padding: 0 10px 0 12px;
  user-select: none;
  width: 100%;
`;

interface Props {
  browserFields: BrowserFields;
  columns: ColumnHeader[];
  dataProviders: DataProvider[];
  flyoutHeaderHeight: number;
  flyoutHeight: number;
  id: string;
  indexPattern: StaticIndexPattern;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  kqlMode: timelineModel.KqlMode;
  kqlQueryExpression: string;
  onChangeDataProviderKqlQuery: OnChangeDataProviderKqlQuery;
  onChangeDroppableAndProvider: OnChangeDroppableAndProvider;
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onDataProviderRemoved: OnDataProviderRemoved;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  onToggleDataProviderExcluded: OnToggleDataProviderExcluded;
  show: boolean;
  sort: Sort;
}

/** The parent Timeline component */
export const Timeline = pure<Props>(
  ({
    browserFields,
    columns,
    dataProviders,
    flyoutHeaderHeight,
    flyoutHeight,
    id,
    indexPattern,
    itemsPerPage,
    itemsPerPageOptions,
    kqlMode,
    kqlQueryExpression,
    onChangeDataProviderKqlQuery,
    onChangeDroppableAndProvider,
    onChangeItemsPerPage,
    onDataProviderRemoved,
    onToggleDataProviderEnabled,
    onToggleDataProviderExcluded,
    show,
    sort,
  }) => {
    const combinedQueries = combineQueries(
      dataProviders,
      indexPattern,
      kqlQueryExpression,
      kqlMode
    );
    const columnsHeader = isEmpty(columns) ? defaultHeaders : columns;
    return (
      <AutoSizer detectAnyWindowResize={true} content>
        {({ measureRef, content: { height: timelineHeaderHeight = 0, width = 0 } }) => (
          <TimelineContainer
            data-test-subj="timeline"
            direction="column"
            gutterSize="none"
            justifyContent="flexStart"
          >
            <WrappedByAutoSizer innerRef={measureRef}>
              <TimelineHeader
                id={id}
                indexPattern={indexPattern}
                dataProviders={dataProviders}
                onChangeDataProviderKqlQuery={onChangeDataProviderKqlQuery}
                onChangeDroppableAndProvider={onChangeDroppableAndProvider}
                onDataProviderRemoved={onDataProviderRemoved}
                onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                onToggleDataProviderExcluded={onToggleDataProviderExcluded}
                show={show}
                sort={sort}
              />
            </WrappedByAutoSizer>

            {combinedQueries != null ? (
              <TimelineQuery
                fields={columnsHeader.map(c => c.id)}
                sourceId="default"
                limit={itemsPerPage}
                filterQuery={combinedQueries.filterQuery}
                sortField={{
                  sortFieldId: sort.columnId,
                  direction: sort.sortDirection as Direction,
                }}
              >
                {({ events, loading, totalCount, pageInfo, loadMore, getUpdatedAt }) => (
                  <>
                    <StatefulBody
                      browserFields={browserFields}
                      data={events}
                      id={id}
                      isLoading={loading}
                      height={calculateBodyHeight({
                        flyoutHeight,
                        flyoutHeaderHeight,
                        timelineHeaderHeight,
                        timelineFooterHeight: footerHeight,
                      })}
                      sort={sort}
                      width={width}
                    />
                    <Footer
                      serverSideEventCount={totalCount}
                      hasNextPage={getOr(false, 'hasNextPage', pageInfo)!}
                      height={footerHeight}
                      isLoading={loading}
                      itemsCount={events.length}
                      itemsPerPage={itemsPerPage}
                      itemsPerPageOptions={itemsPerPageOptions}
                      onChangeItemsPerPage={onChangeItemsPerPage}
                      onLoadMore={loadMore}
                      nextCursor={getOr(null, 'endCursor.value', pageInfo)!}
                      tieBreaker={getOr(null, 'endCursor.tiebreaker', pageInfo)!}
                      getUpdatedAt={getUpdatedAt}
                      width={width}
                    />
                  </>
                )}
              </TimelineQuery>
            ) : null}
          </TimelineContainer>
        )}
      </AutoSizer>
    );
  }
);
