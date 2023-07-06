/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from './all_dataset_selection';
import { SingleDatasetSelection } from './single_dataset_selection';

export type DatasetSelection = AllDatasetSelection | SingleDatasetSelection;
export type DatasetSelectionChange = (datasetSelection: DatasetSelection) => void;

export * from './all_dataset_selection';
export * from './single_dataset_selection';
export * from './encoding';
export * from './hydrate_dataset_selection.ts';
export * from './types';
