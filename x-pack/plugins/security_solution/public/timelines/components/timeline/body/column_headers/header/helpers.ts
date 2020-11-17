/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { assertUnreachable } from '../../../../../../../common/utility_types';
import { Direction } from '../../../../../../graphql/types';
import { ColumnHeaderOptions } from '../../../../../../timelines/store/timeline/model';
import { Sort, SortDirection } from '../../sort';

interface GetNewSortDirectionOnClickParams {
  clickedHeader: ColumnHeaderOptions;
  currentSort: Sort[];
}

/** Given a `header`, returns the `SortDirection` applicable to it */
export const getNewSortDirectionOnClick = ({
  clickedHeader,
  currentSort,
}: GetNewSortDirectionOnClickParams): Direction =>
  currentSort.reduce<Direction>(
    (acc, item) => (clickedHeader.id === item.columnId ? getNextSortDirection(item) : acc),
    Direction.desc
  );

/** Given a current sort direction, it returns the next sort direction */
export const getNextSortDirection = (currentSort: Sort): Direction => {
  switch (currentSort.sortDirection) {
    case Direction.desc:
      return Direction.asc;
    case Direction.asc:
      return Direction.desc;
    case 'none':
      return Direction.desc;
    default:
      return assertUnreachable(currentSort.sortDirection, 'Unhandled sort direction');
  }
};

interface GetSortDirectionParams {
  header: ColumnHeaderOptions;
  sort: Sort[];
}

export const getSortDirection = ({ header, sort }: GetSortDirectionParams): SortDirection =>
  sort.reduce<SortDirection>(
    (acc, item) => (header.id === item.columnId ? item.sortDirection : acc),
    'none'
  );
