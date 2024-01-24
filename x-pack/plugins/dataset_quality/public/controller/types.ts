/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import { Direction } from '../hooks';
import { DatasetQualityControllerStateService } from '../state_machines/dataset_quality_controller';

export interface DatasetQualityController {
  state$: Observable<DatasetQualityPublicState>;
  service: DatasetQualityControllerStateService;
}

export interface DatasetQualityTableOptions {
  page?: number;
  rowsPerPage?: number;
  sort?: {
    field: string;
    direction: Direction;
  };
}

export interface DatasetQualityFlyoutOptions {
  dataset?: {
    rawName: string;
    type: string;
    name: string;
    namespace: string;
    title: string;
    integration?: {
      name: string;
      title: string;
      version: string;
    };
  };
}

export interface DatasetQualityPublicState {
  table: DatasetQualityTableOptions;
  flyout: DatasetQualityFlyoutOptions;
}

export type DatasetQualityPublicStateUpdate = Partial<DatasetQualityPublicState>;
