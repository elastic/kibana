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
  isDatasetSelection,
} from '../../../utils/dataset_selection';
import type { LogExplorerProfileContext, LogExplorerProfileEvent } from './types';

interface LogExplorerProfileUrlStateDependencies {
  stateContainer: DiscoverStateContainer;
}

export const listenUrlChange =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  (context) =>
  (send) => {
    const unsubscribe = stateContainer.appState.subscribe((nextState) => {
      const { index } = nextState;
      const prevIndex = stateContainer.appState.getPrevious().index;

      // Preventing update if the index didn't change
      if (prevIndex === index) return;

      try {
        const datasetSelection = extractDatasetSelectionFromIndex({ index, context });

        if (isDatasetSelection(datasetSelection)) {
          send({ type: 'UPDATE_DATASET_SELECTION', data: datasetSelection });
        }
      } catch (error) {
        send({ type: 'DATASET_SELECTION_RESTORE_FAILURE' });
      }
    });

    return () => unsubscribe();
  };

export const initializeFromUrl =
  ({
    stateContainer,
  }: LogExplorerProfileUrlStateDependencies): InvokeCreator<
    LogExplorerProfileContext,
    LogExplorerProfileEvent
  > =>
  async (context) => {
    const { index } = stateContainer.appState.getState();

    return extractDatasetSelectionFromIndex({ index, context });
  };

const extractDatasetSelectionFromIndex = ({
  index,
  context,
}: {
  index?: string;
  context: LogExplorerProfileContext;
}) => {
  // If the index parameter doesn't exists, use initialContext value or fallback to AllDatasetSelection
  if (!index) {
    return context.datasetSelection ?? AllDatasetSelection.create();
  }

  const rawDatasetSelection = decodeDatasetSelectionId(index);
  const datasetSelection = hydrateDatasetSelection(rawDatasetSelection);

  return datasetSelection;
};
