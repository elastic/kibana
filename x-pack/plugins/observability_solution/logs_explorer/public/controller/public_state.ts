/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  availableControlsPanels,
  controlPanelConfigs,
  ControlPanels,
  hydrateDataSourceSelection,
} from '../../common';
import {
  DEFAULT_CONTEXT,
  LogsExplorerControllerContext,
} from '../state_machines/logs_explorer_controller';
import {
  LogsExplorerPublicState,
  LogsExplorerPublicStateUpdate,
  OptionsListControl,
} from './types';

export const getPublicStateFromContext = (
  context: LogsExplorerControllerContext
): LogsExplorerPublicState => {
  return {
    chart: context.chart,
    dataSourceSelection: context.dataSourceSelection.toPlainSelection(),
    grid: context.grid,
    filters: context.filters,
    query: context.query,
    refreshInterval: context.refreshInterval,
    time: context.time,
    controls: getPublicControlsStateFromControlPanels(context.controlPanels),
  };
};

export const getContextFromPublicState = (
  publicState: LogsExplorerPublicStateUpdate
): LogsExplorerControllerContext => ({
  ...DEFAULT_CONTEXT,
  chart: {
    ...DEFAULT_CONTEXT.chart,
    ...publicState.chart,
  },
  controlPanels: getControlPanelsFromPublicControlsState(publicState.controls),
  dataSourceSelection:
    publicState.dataSourceSelection != null
      ? hydrateDataSourceSelection(publicState.dataSourceSelection)
      : DEFAULT_CONTEXT.dataSourceSelection,
  grid: {
    ...DEFAULT_CONTEXT.grid,
    ...publicState.grid,
    rows: {
      ...DEFAULT_CONTEXT.grid.rows,
      ...publicState.grid?.rows,
    },
  },
  filters: publicState.filters ?? DEFAULT_CONTEXT.filters,
  query: publicState.query ?? DEFAULT_CONTEXT.query,
  refreshInterval: publicState.refreshInterval ?? DEFAULT_CONTEXT.refreshInterval,
  time: publicState.time ?? DEFAULT_CONTEXT.time,
});

const getPublicControlsStateFromControlPanels = (
  controlPanels: ControlPanels | undefined
): LogsExplorerPublicState['controls'] =>
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
  publicControlsState: LogsExplorerPublicStateUpdate['controls']
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
};
