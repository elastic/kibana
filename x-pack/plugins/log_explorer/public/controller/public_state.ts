/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { ControlPanels } from '../../common';
import { hydrateDatasetSelection } from '../../common';
import {
  DEFAULT_CONTEXT,
  LogExplorerControllerContext,
} from '../state_machines/log_explorer_controller';
import { LogExplorerPublicState, LogExplorerPublicStateUpdate } from './types';

export const getPublicStateFromContext = (
  context: LogExplorerControllerContext
): LogExplorerPublicState => {
  return {
    chart: context.chart,
    datasetSelection: context.datasetSelection.toPlainSelection(),
    grid: context.grid,
    filters: context.filters,
    query: context.query,
    refreshInterval: context.refreshInterval,
    time: context.time,
    // TODO: fix control panels
    // controls: getPublicControlsStateFromControlPanels(context.controlPanels),
  };
};

export const getContextFromPublicState = (
  publicState: LogExplorerPublicStateUpdate
): LogExplorerControllerContext => ({
  ...DEFAULT_CONTEXT,
  chart: {
    ...DEFAULT_CONTEXT.chart,
    ...publicState.chart,
  },
  datasetSelection:
    publicState.datasetSelection != null
      ? hydrateDatasetSelection(publicState.datasetSelection)
      : DEFAULT_CONTEXT.datasetSelection,
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
  // TODO: add control panels
});

// const getPublicControlsStateFromControlPanels = (
//   controlPanels: ControlPanels | undefined
// ): LogExplorerPublicState['controls'] =>
//   Object.entries(controlPanels ?? {}).map(([controlId, controlConfig]) => ({
//     controlId,
//     selectedOptions: controlConfig.explicitInput.selectedOptions ?? [],
//   }));

// const getControlPanelsFromPublicControlsState = (
//   publicControlsState: LogExplorerPublicState['controls']
// ) => {
//   return publicControlsState.reduce(() => {}, {});
// };
