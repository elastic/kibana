/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '../../../../../../common/search_strategy';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { assertUnreachable } from '../../../../../../common/utility_types';
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
      return assertUnreachable(currentSort.sortDirection as never, 'Unhandled sort direction');
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

export const getSortIndex = ({ header, sort }: GetSortDirectionParams): number =>
  sort.findIndex((s) => s.columnId === header.id);
