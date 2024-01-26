/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { ObservabilityLogExplorerLocationState } from '@kbn/deeplinks-observability/locators';
import { AllDatasetsLocator } from './all_datasets';
import { SingleDatasetLocator } from './single_dataset';

export * from './single_dataset';
export * from './all_datasets';
export * from './utils';

export interface ObservabilityLogExplorerLocators {
  allDatasetsLocator: AllDatasetsLocator;
  singleDatasetLocator: SingleDatasetLocator;
}
