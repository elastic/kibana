/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DatasetQualityControllerContext,
  DEFAULT_CONTEXT,
} from '../state_machines/dataset_quality_controller';
import { DatasetQualityPublicState, DatasetQualityPublicStateUpdate } from './types';

export const getPublicStateFromContext = (
  context: DatasetQualityControllerContext
): DatasetQualityPublicState => {
  return {
    table: context.table,
  };
};

export const getContextFromPublicState = (
  publicState: DatasetQualityPublicStateUpdate
): DatasetQualityControllerContext => ({
  ...DEFAULT_CONTEXT,
  table: {
    ...DEFAULT_CONTEXT.table,
    ...publicState.table,
  },
});

/* const getPublicControlsStateFromControlPanels = (
  controlPanels: ControlPanels | undefined
): LogExplorerPublicState['controls'] =>
  controlPanels != null
    ? {
        ...(availableControlsPanels.NAMESPACE in controlPanels
          ? {
              [availableControlsPanels.NAMESPACE]: getOptionsListPublicControlStateFromControlPanel(
                controlPanels[availableControlsPanels.NAMESPACE]
              ),
            }
          : {}),
      }
    : {};

const getOptionsListPublicControlStateFromControlPanel = (
  optionsListControlPanel: ControlPanels[string]
): OptionsListControl => ({
  mode: optionsListControlPanel.explicitInput.exclude ? 'exclude' : 'include',
  selection: optionsListControlPanel.explicitInput.existsSelected
    ? { type: 'exists' }
    : {
        type: 'options',
        selectedOptions: optionsListControlPanel.explicitInput.selectedOptions ?? [],
      },
});

const getControlPanelsFromPublicControlsState = (
  publicControlsState: LogExplorerPublicStateUpdate['controls']
): ControlPanels => {
  if (publicControlsState == null) {
    return {};
  }

  const namespacePublicControlState = publicControlsState[availableControlsPanels.NAMESPACE];

  return {
    ...(namespacePublicControlState
      ? {
          [availableControlsPanels.NAMESPACE]: getControlPanelFromOptionsListPublicControlState(
            availableControlsPanels.NAMESPACE,
            namespacePublicControlState
          ),
        }
      : {}),
  };
};

const getControlPanelFromOptionsListPublicControlState = (
  controlId: string,
  publicControlState: OptionsListControl
): ControlPanels[string] => {
  const defaultControlPanelConfig = controlPanelConfigs[controlId];

  return {
    ...defaultControlPanelConfig,
    explicitInput: {
      ...defaultControlPanelConfig.explicitInput,
      exclude: publicControlState.mode === 'exclude',
      ...(publicControlState.selection.type === 'exists'
        ? {
            existsSelected: true,
          }
        : {
            selectedOptions: publicControlState.selection.selectedOptions,
          }),
    },
  };
}; */
