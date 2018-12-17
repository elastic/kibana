/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getOr } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';
import { ECS } from './ecs';

import { EventsQuery } from '../../containers/events';
import { Theme } from '../../store/local/app/model';
import { AutoSizer } from '../auto_sizer';
import { Body } from './body';
import { ColumnHeader } from './body/column_headers/column_header';
import { Range } from './body/column_headers/range_picker/ranges';
import { ColumnRenderer } from './body/renderers';
import { RowRenderer } from './body/renderers';
import { Sort } from './body/sort';
import { DataProvider } from './data_providers/data_provider';
import {
  OnChangeItemsPerPage,
  OnChangePage,
  OnColumnSorted,
  OnDataProviderRemoved,
  OnFilterChange,
  OnRangeSelected,
  OnToggleDataProviderEnabled,
} from './events';
import { Footer, footerHeight } from './footer';
import { TimelineHeader } from './header/timeline_header';
import { calculateBodyHeight, combineQueries, getIsLoading } from './helpers';

interface Props {
  activePage: number;
  columnHeaders: ColumnHeader[];
  columnRenderers: ColumnRenderer[];
  dataProviders: DataProvider[];
  flyoutHeaderHeight: number;
  flyoutHeight: number;
  id: string;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
  onChangeItemsPerPage: OnChangeItemsPerPage;
  onChangePage: OnChangePage;
  onColumnSorted: OnColumnSorted;
  onDataProviderRemoved: OnDataProviderRemoved;
  onFilterChange: OnFilterChange;
  onRangeSelected: OnRangeSelected;
  onToggleDataProviderEnabled: OnToggleDataProviderEnabled;
  pageCount: number;
  range: Range;
  rowRenderers: RowRenderer[];
  show: boolean;
  sort: Sort;
  theme: Theme;
}

const WrappedByAutoSizer = styled.div``; // required by AutoSizer

/** The parent Timeline component */
export const Timeline = pure<Props>(
  ({
    activePage,
    columnHeaders,
    columnRenderers,
    dataProviders,
    flyoutHeaderHeight,
    flyoutHeight,
    id,
    itemsPerPage,
    itemsPerPageOptions,
    onChangeItemsPerPage,
    onChangePage,
    onColumnSorted,
    onDataProviderRemoved,
    onFilterChange,
    onRangeSelected,
    onToggleDataProviderEnabled,
    pageCount,
    range,
    rowRenderers,
    show,
    sort,
    theme,
  }) => {
    const combinedQueries = combineQueries(dataProviders);

    return (
      <>
        <AutoSizer detectAnyWindowResize={true} content>
          {({ measureRef, content: { height: timelineHeaderHeight = 0 } }) => (
            <>
              <WrappedByAutoSizer innerRef={measureRef}>
                <TimelineHeader
                  columnHeaders={columnHeaders}
                  id={id}
                  dataProviders={dataProviders}
                  onColumnSorted={onColumnSorted}
                  onDataProviderRemoved={onDataProviderRemoved}
                  onFilterChange={onFilterChange}
                  onRangeSelected={onRangeSelected}
                  onToggleDataProviderEnabled={onToggleDataProviderEnabled}
                  range={range}
                  show={show}
                  sort={sort}
                  theme={theme}
                />
              </WrappedByAutoSizer>

              <div data-test-subj="timeline">
                {combinedQueries != null ? (
                  <EventsQuery
                    sourceId="default"
                    startDate={combinedQueries.queryProps.startDate}
                    endDate={combinedQueries.queryProps.endDate}
                    filterQuery={combinedQueries.queryProps.filterQuery}
                  >
                    {(resData: {}) => (
                      <>
                        <Body
                          id={id}
                          columnHeaders={columnHeaders}
                          columnRenderers={columnRenderers}
                          data={getOr([], combinedQueries.resParm, resData) as ECS[]}
                          height={calculateBodyHeight({
                            flyoutHeight,
                            flyoutHeaderHeight,
                            timelineHeaderHeight,
                            timelineFooterHeight: footerHeight,
                          })}
                          rowRenderers={rowRenderers}
                          theme={theme}
                        />
                        <Footer
                          activePage={activePage}
                          dataProviders={dataProviders}
                          serverSideEventCount={Infinity} // TODO: replace sentinel value with value from response
                          height={footerHeight}
                          isLoading={getIsLoading(resData)}
                          itemsPerPage={itemsPerPage}
                          itemsPerPageOptions={itemsPerPageOptions}
                          pageCount={pageCount}
                          onChangeItemsPerPage={onChangeItemsPerPage}
                          onChangePage={onChangePage}
                        />
                      </>
                    )}
                  </EventsQuery>
                ) : null}
              </div>
            </>
          )}
        </AutoSizer>
      </>
    );
  }
);
