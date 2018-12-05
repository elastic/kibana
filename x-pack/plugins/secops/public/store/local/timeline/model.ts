/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Range } from '../../../components/timeline/body/column_headers/range_picker/ranges';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';

export const DEFAULT_PAGE_COUNT = 2; // TODO: Figure out why Eui Pager will not render unless this is a minimum of 2 pages.
export interface TimelineModel {
  id: string;
  dataProviders: DataProvider[];
  range: Range;
  show: boolean;
  sort: Sort;
  activePage: number;
  pageCount: number;
  itemsPerPage: number;
  itemsPerPageOptions: number[];
}

export const timelineDefaults: Readonly<
  Pick<
    TimelineModel,
    | 'dataProviders'
    | 'range'
    | 'show'
    | 'sort'
    | 'activePage'
    | 'itemsPerPage'
    | 'itemsPerPageOptions'
    | 'pageCount'
  >
> = {
  dataProviders: [],
  range: '1 Day',
  show: false,
  activePage: 0,
  itemsPerPage: 5,
  pageCount: DEFAULT_PAGE_COUNT,
  itemsPerPageOptions: [5, 10, 20],
  sort: {
    columnId: 'timestamp',
    sortDirection: 'descending',
  },
};
