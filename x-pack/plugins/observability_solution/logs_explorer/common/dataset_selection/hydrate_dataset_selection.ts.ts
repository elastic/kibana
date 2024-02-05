/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from './all_dataset_selection';
import { DataViewSelection } from './data_view_selection';
import { SingleDatasetSelection } from './single_dataset_selection';
import { DatasetSelectionPlain } from './types';
import { UnresolvedDatasetSelection } from './unresolved_dataset_selection';

export const hydrateDatasetSelection = (datasetSelection: DatasetSelectionPlain) => {
  if (datasetSelection.selectionType === 'all') {
    return AllDatasetSelection.create();
  } else if (datasetSelection.selectionType === 'single') {
    return SingleDatasetSelection.fromSelection(datasetSelection.selection);
  } else if (datasetSelection.selectionType === 'dataView') {
    return DataViewSelection.fromSelection(datasetSelection.selection);
  } else {
    return UnresolvedDatasetSelection.fromSelection(datasetSelection.selection);
  }
};
