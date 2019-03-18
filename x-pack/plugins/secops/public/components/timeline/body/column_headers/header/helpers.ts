/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction } from '../../../../../graphql/types';
import { Sort, SortDirection } from '../../sort';
import { ColumnHeader } from '../column_header';

interface GetNewSortDirectionOnClickParams {
  clickedHeader: ColumnHeader;
  currentSort: Sort;
}

const unhandledSortDirection = (x: never): never => {
  throw new Error('Unhandled sort direction');
};

/** Given a `header`, returns the `SortDirection` applicable to it */
export const getNewSortDirectionOnClick = ({
  clickedHeader,
  currentSort,
}: GetNewSortDirectionOnClickParams): Direction =>
  clickedHeader.id === currentSort.columnId ? getNextSortDirection(currentSort) : Direction.desc;

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
      return unhandledSortDirection(currentSort.sortDirection);
  }
};

interface GetSortDirectionParams {
  header: ColumnHeader;
  sort: Sort;
}

export const getSortDirection = ({ header, sort }: GetSortDirectionParams): SortDirection =>
  header.id === sort.columnId ? sort.sortDirection : 'none';

export const justifyActions = (isLoading: boolean): 'center' | 'spaceBetween' =>
  isLoading ? 'center' : 'spaceBetween';
