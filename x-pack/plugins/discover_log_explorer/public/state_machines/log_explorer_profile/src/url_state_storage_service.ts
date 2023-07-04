/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { InvokeCreator } from 'xstate';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import {
  AllDatasetSelection,
  decodeDatasetSelectionId,
  hydrateDatasetSelection,
} from '../../../utils/dataset_selection';
import type { LogExplorerProfileContext, LogExplorerProfileEvent } from './types';

interface LogExplorerProfileUrlStateDependencies {
  stateContainer: DiscoverStateContainer;
}

export const initializeFromUrl =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (_context, _event) => {
    const { index } = stateContainer.appState.getState();

    if (!index) {
      return AllDatasetSelection.create();
    }

    const rawDatasetSelection = decodeDatasetSelectionId(index);
    const datasetSelection = hydrateDatasetSelection(rawDatasetSelection);

    return datasetSelection;
  };

export const updateUrlState =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context) => {
    const { dataView } = context;

    return stateContainer.appState.update({
      index: dataView.id,
      columns: ['@timestamp', 'message'],
    });
  };
