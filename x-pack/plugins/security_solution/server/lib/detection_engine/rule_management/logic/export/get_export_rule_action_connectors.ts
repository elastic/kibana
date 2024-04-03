/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsExportResultDetails,
  ISavedObjectsExporter,
  SavedObjectsExportExcludedObject,
  SavedObject,
} from '@kbn/core-saved-objects-server';
import { createConcatStream, createMapStream, createPromiseFromStreams } from '@kbn/utils';
import type { ExportableRule } from './exportable_rule';

export interface DefaultActionConnectorDetails {
  exported_action_connector_count: number;
  missing_action_connection_count: number;
  missing_action_connections: SavedObjectTypeIdTuple[];
  excluded_action_connection_count: number;
  excluded_action_connections: SavedObjectsExportExcludedObject[];
}

const defaultActionConnectorDetails: DefaultActionConnectorDetails = {
  exported_action_connector_count: 0,
  missing_action_connection_count: 0,
  missing_action_connections: [],
  excluded_action_connection_count: 0,
  excluded_action_connections: [],
};

const mapExportedActionConnectorsDetailsToDefault = (
  exportDetails: SavedObjectsExportResultDetails
): DefaultActionConnectorDetails => {
  return {
    exported_action_connector_count: exportDetails.exportedCount,
    missing_action_connection_count: exportDetails.missingRefCount,
    missing_action_connections: exportDetails.missingReferences,
    excluded_action_connection_count: exportDetails.excludedObjectsCount,
    excluded_action_connections: exportDetails.excludedObjects,
  };
};
const filterOutPredefinedActionConnectorsIds = async (
  actionsClient: ActionsClient,
  actionsIdsToExport: string[]
): Promise<string[]> => {
  const allActions = await actionsClient.getAll();
  const predefinedActionsIds = allActions
    .filter(({ isPreconfigured }) => isPreconfigured)
    .map(({ id }) => id);
  if (predefinedActionsIds.length)
    return actionsIdsToExport.filter((id) => !predefinedActionsIds.includes(id));
  return actionsIdsToExport;
};

// This function is used to get, and return the exported actions' connectors'
// using the ISavedObjectsExporter and it filters out any Preconfigured
// Connectors as they shouldn't be exported, imported or changed
// by the user, that's why the function also accepts the actionsClient
// to getAll actions connectors

export const getRuleActionConnectorsForExport = async (
  rules: ExportableRule[],
  actionsExporter: ISavedObjectsExporter,
  request: KibanaRequest,
  actionsClient: ActionsClient
) => {
  const exportedActionConnectors: {
    actionConnectors: string;
    actionConnectorDetails: DefaultActionConnectorDetails;
  } = {
    actionConnectors: '',
    actionConnectorDetails: defaultActionConnectorDetails,
  };

  let actionsIds = [...new Set(rules.flatMap((rule) => rule.actions.map(({ id }) => id)))];
  if (!actionsIds.length) return exportedActionConnectors;

  // handle preconfigured connectors
  actionsIds = await filterOutPredefinedActionConnectorsIds(actionsClient, actionsIds);

  if (!actionsIds.length) return exportedActionConnectors;

  const getActionsByObjectsParam = actionsIds.map((id) => ({ type: 'action', id }));
  const actionDetails = await actionsExporter.exportByObjects({
    objects: getActionsByObjectsParam,
    request,
  });

  if (!actionDetails) {
    exportedActionConnectors.actionConnectorDetails = {
      exported_action_connector_count: 0,
      missing_action_connection_count: actionsIds.length,
      missing_action_connections: [], // TODO: check how to generate SO
      excluded_action_connection_count: 0,
      excluded_action_connections: [],
    };
    return exportedActionConnectors;
  }

  const actionsConnectorsToExport: SavedObject[] = await createPromiseFromStreams([
    actionDetails,
    createMapStream((obj: SavedObject | SavedObjectsExportResultDetails) => {
      if ('exportedCount' in obj)
        exportedActionConnectors.actionConnectorDetails =
          mapExportedActionConnectorsDetailsToDefault(obj);
      else return JSON.stringify(obj);
    }),
    createConcatStream([]),
  ]);
  exportedActionConnectors.actionConnectors = actionsConnectorsToExport.join('\n');
  return exportedActionConnectors;
};
