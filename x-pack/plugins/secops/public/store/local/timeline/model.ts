/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Range } from '../../../components/timeline/body/column_headers/range_picker/ranges';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';

export interface TimelineModel {
  id: string;
  dataProviders: DataProvider[];
  range: Range;
  show: boolean;
  sort: Sort;
  activePage: number;
  itemsPerPage: number;
}

export const timelineDefaults: Readonly<
  Pick<TimelineModel, 'dataProviders' | 'range' | 'show' | 'sort' | 'activePage' | 'itemsPerPage'>
> = {
  dataProviders: [],
  range: '1 Day',
  show: false,
  activePage: 0,
  itemsPerPage: 5,
  sort: {
    columnId: 'timestamp',
    sortDirection: 'descending',
  },
};
