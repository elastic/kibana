/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { DIRECTION, SORT_FIELD } from '../hooks';
import { DatasetQualityControllerStateService } from '../state_machines/dataset_quality_controller';

export interface DatasetQualityController {
  state$: Observable<DatasetQualityPublicState>;
  service: DatasetQualityControllerStateService;
}

export interface DatasetQualityTableOptions {
  page: number;
  rowsPerPage: number;
  sort: {
    field: SORT_FIELD;
    direction: DIRECTION;
  };
}

export interface DatasetQualityPublicState {
  table: DatasetQualityTableOptions;
}

export type DatasetQualityPublicStateUpdate = Partial<DatasetQualityPublicState>;
