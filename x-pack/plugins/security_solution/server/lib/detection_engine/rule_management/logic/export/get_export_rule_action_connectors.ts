/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectTypeIdTuple } from '@kbn/core-saved-objects-common';
import type {
  SavedObjectsExportResultDetails,
  ISavedObjectsExporter,
  SavedObjectsExportExcludedObject,
  SavedObject,
} from '@kbn/core-saved-objects-server';
import { createConcatStream, createMapStream, createPromiseFromStreams } from '@kbn/utils';
import type { RuleResponse } from '../../../../../../common/detection_engine/rule_schema';

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

export const getRuleActionConnectorsForExport = async (
  rules: RuleResponse[],
  actionsExporter: ISavedObjectsExporter,
  request: KibanaRequest
) => {
  const exportedActionConnectors: {
    actionConnectors: string;
    actionConnectorDetails: DefaultActionConnectorDetails;
  } = {
    actionConnectors: '',
    actionConnectorDetails: defaultActionConnectorDetails,
  };

  const actionsIds = [...new Set(rules.flatMap((rule) => rule.actions.map(({ id }) => id)))];

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
