/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from './all_dataset_selection';
import { DataViewSelection } from './data_view_selection';
import { SingleDatasetSelection } from './single_dataset_selection';
import { UnresolvedDatasetSelection } from './unresolved_dataset_selection';

export type DatasetSelection =
  | AllDatasetSelection
  | SingleDatasetSelection
  | UnresolvedDatasetSelection;

export type DataSourceSelection = DatasetSelection | DataViewSelection;

export type DataSourceSelectionChangeHandler = (selection: DataSourceSelection) => void;

export const isAllDatasetSelection = (input: any): input is AllDatasetSelection => {
  return input instanceof AllDatasetSelection;
};

export const isSingleDatasetSelection = (input: any): input is SingleDatasetSelection => {
  return input instanceof SingleDatasetSelection;
};

export const isUnresolvedDatasetSelection = (input: any): input is UnresolvedDatasetSelection => {
  return input instanceof UnresolvedDatasetSelection;
};

export const isDataViewSelection = (input: any): input is DataViewSelection => {
  return input instanceof DataViewSelection;
};

export const isDatasetSelection = (input: any): input is DatasetSelection => {
  return (
    isAllDatasetSelection(input) ||
    isSingleDatasetSelection(input) ||
    isUnresolvedDatasetSelection(input)
  );
};

export const isDataSourceSelection = (input: any): input is DataSourceSelection => {
  return isDatasetSelection(input) || isDataViewSelection(input);
};

export * from './all_dataset_selection';
export * from './data_view_selection';
export * from './hydrate_data_source_selection';
export * from './single_dataset_selection';
export * from './types';
export * from './unresolved_dataset_selection';
