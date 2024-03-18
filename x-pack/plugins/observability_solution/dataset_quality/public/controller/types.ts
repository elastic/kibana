/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import {
  DatasetQualityControllerStateService,
  WithFilters,
  WithFlyoutOptions,
  WithTableOptions,
} from '../state_machines/dataset_quality_controller';

export interface DatasetQualityController {
  state$: Observable<DatasetQualityPublicState>;
  service: DatasetQualityControllerStateService;
}

type TableSortOptions = Omit<WithTableOptions['table']['sort'], 'field'> & { field: string };

export type DatasetQualityTableOptions = Partial<
  Omit<WithTableOptions['table'], 'sort'> & { sort: TableSortOptions }
>;

export type DatasetQualityFlyoutOptions = Omit<WithFlyoutOptions['flyout'], 'datasetDetails'>;

export type DatasetQualityFilterOptions = Partial<WithFilters['filters']>;

export interface DatasetQualityPublicState {
  table: DatasetQualityTableOptions;
  flyout: DatasetQualityFlyoutOptions;
  filters: DatasetQualityFilterOptions;
}

export type DatasetQualityPublicStateUpdate = Partial<DatasetQualityPublicState>;
