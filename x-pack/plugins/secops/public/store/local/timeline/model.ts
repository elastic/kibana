/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Sort } from '../../../components/timeline/body/sort';
import { DataProvider } from '../../../components/timeline/data_providers/data_provider';
import { mockDataProviders } from '../../../components/timeline/data_providers/mock/mock_data_providers';
import { ECS } from '../../../components/timeline/ecs';

export interface TimelineModel {
  id: string;
  dataProviders: DataProvider[];
  data: ECS[];
  sort: Sort;
}

export const timelineDefaults: Readonly<Pick<TimelineModel, 'dataProviders' | 'data' | 'sort'>> = {
  dataProviders: mockDataProviders,
  data: [],
  sort: {
    columnId: '@timestamp',
    sortDirection: 'descending',
  },
};
