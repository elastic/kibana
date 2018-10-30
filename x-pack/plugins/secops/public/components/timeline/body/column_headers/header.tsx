/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as fp from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import { OnColumnSorted, OnFilterChange } from '../../events';
import { Sort, SortDirection } from '../sort/sort';
import { SortIndicator } from '../sort/sort_indicator';
import { ColumnHeader } from './column_header';
import { Filter } from './filter';

interface GetSortDirectionParams {
  header: ColumnHeader;
  sort: Sort;
}

/** Given a `header`, returns the `SortDirection` applicable to it */
export const getSortDirection = ({ header, sort }: GetSortDirectionParams): SortDirection =>
  header.id === sort.columnId ? sort.sortDirection : 'none';

/** Given a current sort direction, it returns the next sort direction */
export const getNextSortDirection = (currentSort: Sort): SortDirection => {
  switch (currentSort.sortDirection) {
    case 'descending':
      return 'ascending';
    case 'ascending':
      return 'descending';
    default:
      return 'descending';
  }
};

interface GetNewSortDirectionOnClickParams {
  clickedHeader: ColumnHeader;
  currentSort: Sort;
}

/** Given a `header`, returns the `SortDirection` applicable to it */
export const getNewSortDirectionOnClick = ({
  clickedHeader,
  currentSort,
}: GetNewSortDirectionOnClickParams): SortDirection =>
  clickedHeader.id === currentSort.columnId ? getNextSortDirection(currentSort) : 'descending';

interface Props {
  header: ColumnHeader;
  onColumnSorted?: OnColumnSorted;
  onFilterChange?: OnFilterChange;
  sort: Sort;
}

/** Renders a header */
export const Header = pure<Props>(
  ({ header, sort, onColumnSorted = fp.noop, onFilterChange = fp.noop }) => {
    const onClick = () => {
      onColumnSorted({
        columnId: header.id,
        sortDirection: getNewSortDirectionOnClick({
          clickedHeader: header,
          currentSort: sort,
        }),
      });
    };

    return (
      <div
        data-test-subj="headerContainer"
        key={header.id}
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: `${header.minWidth}px`,
        }}
      >
        <div
          data-test-subj="header"
          onClick={onClick}
          style={{
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          <span data-test-subj="headerText">{header.text}</span>
          <SortIndicator sortDirection={getSortDirection({ header, sort })} />
        </div>
        <Filter header={header} onFilterChange={onFilterChange} />
      </div>
    );
  }
);
