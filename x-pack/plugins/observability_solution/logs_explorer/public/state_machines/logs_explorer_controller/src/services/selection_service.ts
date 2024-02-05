/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InvokeCreator } from 'xstate';
import { Dataset } from '../../../../../common/datasets';
import { SingleDatasetSelection } from '../../../../../common/dataset_selection';
import { IDatasetsClient } from '../../../../services/datasets';
import { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';

interface LogsExplorerControllerUrlStateDependencies {
  datasetsClient: IDatasetsClient;
}

export const validateSelection =
  ({
    datasetsClient,
  }: LogsExplorerControllerUrlStateDependencies): InvokeCreator<
    LogsExplorerControllerContext,
    LogsExplorerControllerEvent
  > =>
  (context) =>
  async (send) => {
    const unresolvedIntegrationName =
      context.datasetSelection.selection.dataset.parentIntegration?.name;
    const unresolvedDatasetName = context.datasetSelection.selection.dataset.name;

    if (context.datasetSelection.selectionType !== 'unresolved' || !unresolvedIntegrationName) {
      return send('LISTEN_TO_CHANGES');
    }

    try {
      const { items } = await datasetsClient.findIntegrations({
        nameQuery: unresolvedIntegrationName,
      });

      // There should only be one matching integration with the given name
      // If no integration matches, skip the update and listen for user changes
      const installedIntegration = items[0];
      if (!installedIntegration) {
        return send('LISTEN_TO_CHANGES');
      }

      // If no dataset matches the passed name for the retrieved integration,
      // skip the update and listen for user changes
      const targetDataset = installedIntegration.datasets.find(
        (d) => d.name === unresolvedDatasetName
      );
      if (!targetDataset) {
        return send('LISTEN_TO_CHANGES');
      }

      const dataset = Dataset.create(targetDataset, installedIntegration);
      const datasetSelection = SingleDatasetSelection.create(dataset);

      send({ type: 'UPDATE_DATASET_SELECTION', data: datasetSelection });
    } catch (error) {
      return send('DATASET_SELECTION_RESTORE_FAILURE');
    }
  };
