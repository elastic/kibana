/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ObservabilityLogsExplorerLocationState } from '@kbn/deeplinks-observability/locators';
import { AllDatasetsLocator } from './all_datasets_locator';
import { DataViewLocator } from './data_view_locator';
import { SingleDatasetLocator } from './single_dataset_locator';
import { DatasetQualityLocator } from './dataset_quality_locator';

export * from './dataset_quality_locator';
export * from './single_dataset_locator';
export * from './all_datasets_locator';
export * from './utils';

export interface ObservabilityLogsExplorerLocators {
  allDatasetsLocator: AllDatasetsLocator;
  dataViewLocator: DataViewLocator;
  singleDatasetLocator: SingleDatasetLocator;
  datasetQualityLocator: DatasetQualityLocator;
}
