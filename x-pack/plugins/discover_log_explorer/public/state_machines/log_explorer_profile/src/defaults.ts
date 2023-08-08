/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllDatasetSelection } from '../../../utils/dataset_selection';
import { ControlPanels, DefaultLogExplorerProfileState } from './types';

export const DEFAULT_CONTEXT: DefaultLogExplorerProfileState = {
  datasetSelection: AllDatasetSelection.create(),
};

export const CONTROL_PANELS_URL_KEY = 'controlPanels';

export const availableControlsPanels = {
  NAMESPACE: 'data_stream.namespace',
};

export const controlPanelConfigs: ControlPanels = {
  [availableControlsPanels.NAMESPACE]: {
    order: 0,
    width: 'medium',
    grow: false,
    type: 'optionsListControl',
    explicitInput: {
      id: availableControlsPanels.NAMESPACE,
      fieldName: availableControlsPanels.NAMESPACE,
      title: 'Namespace',
    },
  },
};

export const availableControlPanelFields = Object.values(availableControlsPanels);
