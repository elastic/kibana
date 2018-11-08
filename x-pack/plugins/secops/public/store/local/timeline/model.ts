/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Range } from '../../../components/timeline/body/column_headers/range_picker/ranges';
import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import { ECS } from '../../../components/timeline/ecs';
import { mockECSData } from '../../../pages/mock/mock_ecs';

export interface TimelineModel {
  id: string;
  dataProviders: DataProvider[];
  data: ECS[];
  range: Range;
  sort: Sort;
}

export const timelineDefaults: Readonly<
  Pick<TimelineModel, 'dataProviders' | 'data' | 'range' | 'sort'>
> = {
  dataProviders: [],
  data: mockECSData,
  range: '1 Day',
  sort: {
    columnId: 'timestamp',
    sortDirection: 'descending',
  },
};
