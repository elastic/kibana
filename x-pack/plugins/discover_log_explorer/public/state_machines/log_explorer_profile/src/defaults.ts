/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from '../../../utils/dataset_selection';
import { DefaultLogExplorerProfileState } from './types';

export const DEFAULT_CONTEXT: DefaultLogExplorerProfileState = {
  datasetSelection: AllDatasetSelection.create(),
};
