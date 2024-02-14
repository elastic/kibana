/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverStart } from '@kbn/discover-plugin/public';
import { InvokeCreator } from 'xstate';
import { Dataset } from '../../../../../common/datasets';
import {
  isDataViewSelection,
  isUnresolvedDatasetSelection,
  SingleDatasetSelection,
  UnresolvedDatasetSelection,
} from '../../../../../common/dataset_selection';
import { IDatasetsClient } from '../../../../services/datasets';
import { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';
import { redirectToDiscover } from './discover_service';

interface LogsExplorerControllerSelectionServiceDeps {
  datasetsClient: IDatasetsClient;
  discover: DiscoverStart;
}

export const initializeSelection =
  ({
    datasetsClient,
    discover,
  }: LogsExplorerControllerSelectionServiceDeps): InvokeCreator<
    LogsExplorerControllerContext,
    LogsExplorerControllerEvent
  > =>
  (context) =>
  async (send) => {
    /**
     * First validation.
     * If the selection is a data view which is not of logs type, redirect to Discover.
     */
    if (
      isDataViewSelection(context.datasetSelection) &&
      context.datasetSelection.selection.dataView.isUnknownDataType()
    ) {
      return redirectToDiscover({ context, datasetSelection: context.datasetSelection, discover });
    }

    /**
     * Second validation.
     * If the selection is a data view, initialize it.
     */
    if (isDataViewSelection(context.datasetSelection)) {
      return send('INITIALIZE_DATA_VIEW');
    }

    /**
     * Third validation.
     * If the selection is an unresolved dataset, perform a look up against integrations..
     */
    if (isUnresolvedDatasetSelection(context.datasetSelection)) {
      try {
        const selection = await lookupUnresolvedDatasetSelection(context.datasetSelection, {
          datasetsClient,
        });

        if (selection !== null) {
          return send({ type: 'INITIALIZE_DATASET', data: selection });
        }
      } catch {
        return send('DATASET_SELECTION_RESTORE_FAILURE');
      }
    }

    /**
     * For any remaining case, initialize the current dataset selection
     */
    return send('INITIALIZE_DATASET');
  };

const lookupUnresolvedDatasetSelection = async (
  datasetSelection: UnresolvedDatasetSelection,
  { datasetsClient }: Pick<LogsExplorerControllerSelectionServiceDeps, 'datasetsClient'>
) => {
  const nameQuery = datasetSelection.selection.dataset.parentIntegration?.name;

  if (nameQuery) {
    return null;
  }

  const { items } = await datasetsClient.findIntegrations({ nameQuery });

  // There should only be one matching integration with the given name
  // If no integration matches, skip the update and listen for user changes
  const installedIntegration = items[0];
  if (!installedIntegration) {
    return null;
  }

  // If no dataset matches the passed name for the retrieved integration,
  // skip the update and listen for user changes
  const targetDataset = installedIntegration.datasets.find((d) => d.name === nameQuery);
  if (!targetDataset) {
    return null;
  }

  const dataset = Dataset.create(targetDataset, installedIntegration);
  return SingleDatasetSelection.create(dataset);
};
