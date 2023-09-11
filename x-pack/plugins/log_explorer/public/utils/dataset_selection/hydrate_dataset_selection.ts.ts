/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from './all_dataset_selection';
import { SingleDatasetSelection } from './single_dataset_selection';
import { DatasetSelectionPlain } from './types';

export const hydrateDatasetSelection = (datasetSelection: DatasetSelectionPlain) => {
  if (datasetSelection.selectionType === 'all') {
    return AllDatasetSelection.create();
  }
  if (datasetSelection.selectionType === 'single') {
    return SingleDatasetSelection.fromSelection(datasetSelection.selection);
  }
};
