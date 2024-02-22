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
export type SelectionChange = (selection: DatasetSelection | DataViewSelection) => void;

export const isDatasetSelection = (input: any): input is DatasetSelection => {
  return (
    input instanceof AllDatasetSelection ||
    input instanceof SingleDatasetSelection ||
    input instanceof UnresolvedDatasetSelection
  );
};

export const isUnresolvedDatasetSelection = (input: any): input is UnresolvedDatasetSelection => {
  return input instanceof UnresolvedDatasetSelection;
};

export const isDataViewSelection = (input: any): input is DataViewSelection => {
  return input instanceof DataViewSelection;
};

export * from './all_dataset_selection';
export * from './data_view_selection';
export * from './single_dataset_selection';
export * from './single_dataset_selection';
export * from './unresolved_dataset_selection';
export * from './errors';
export * from './hydrate_dataset_selection.ts';
export * from './types';
