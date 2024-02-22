/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { InvokeCreator } from 'xstate';
import { LogsExplorerCustomizations } from '../../../../controller';
import { Dataset } from '../../../../../common/datasets';
import {
  DataViewSelection,
  isDataViewSelection,
  isUnresolvedDatasetSelection,
  SingleDatasetSelection,
  UnresolvedDatasetSelection,
} from '../../../../../common/dataset_selection';
import { IDatasetsClient } from '../../../../services/datasets';
import { LogsExplorerControllerContext, LogsExplorerControllerEvent } from '../types';

interface LogsExplorerControllerSelectionServiceDeps {
  datasetsClient: IDatasetsClient;
  dataViews: DataViewsPublicPluginStart;
  events?: LogsExplorerCustomizations['events'];
}

export const initializeSelection =
  ({
    datasetsClient,
    dataViews,
    events,
  }: LogsExplorerControllerSelectionServiceDeps): InvokeCreator<
    LogsExplorerControllerContext,
    LogsExplorerControllerEvent
  > =>
  (context) =>
  async (send) => {
    /**
     * First validation.
     * The selection is a data view.
     */
    if (isDataViewSelection(context.datasetSelection)) {
      let datasetSelection: DataViewSelection | null = context.datasetSelection;
      /**
       * If the selection is unresolved, perform a look up to retrieve it.
       */
      if (datasetSelection.selection.dataView.isUnresolvedDataType()) {
        try {
          datasetSelection = await lookupUnresolvedDataViewSelection(datasetSelection, {
            dataViews,
          });

          if (datasetSelection === null) {
            return send('DATAVIEW_SELECTION_RESTORE_FAILURE');
          }
        } catch {
          return send('DATAVIEW_SELECTION_RESTORE_FAILURE');
        }
      }

      /**
       * If the selection is a data view which is not of logs type, invoke the customization event for unknown data views.
       */
      if (
        datasetSelection.selection.dataView.isUnknownDataType() &&
        events?.onUknownDataViewSelection
      ) {
        return events.onUknownDataViewSelection(context);
      }

      return send({ type: 'INITIALIZE_DATA_VIEW', data: datasetSelection });
    }

    /**
     * Second validation.
     * If the selection is an unresolved dataset, perform a look up against integrations.
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

const lookupUnresolvedDataViewSelection = async (
  datasetSelection: DataViewSelection,
  { dataViews }: Pick<LogsExplorerControllerSelectionServiceDeps, 'dataViews'>
) => {
  const resolvedDataView = await dataViews.get(datasetSelection.toDataviewSpec().id);

  if (!resolvedDataView) {
    return null;
  }

  return DataViewSelection.fromSelection({
    dataView: {
      id: resolvedDataView.id ?? '',
      kibanaSpaces: resolvedDataView.namespaces,
      name: resolvedDataView.name,
      title: resolvedDataView.getIndexPattern(),
      type: resolvedDataView.type,
    },
  });
};
