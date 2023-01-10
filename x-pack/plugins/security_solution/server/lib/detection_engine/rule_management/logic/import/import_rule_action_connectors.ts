/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { ActionResult, ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObject, SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { ISavedObjectsImporter } from '@kbn/core-saved-objects-server';

interface ImportRuleActionConnectorsParams {
  actionConnectors: SavedObject[];
  actionsClient: ActionsClient;
  actionsImporter: ISavedObjectsImporter;
}

export const importRuleActionConnectors = async ({
  actionConnectors,
  actionsClient,
  actionsImporter,
}: ImportRuleActionConnectorsParams): Promise<SavedObjectsImportResponse> => {
  const importResult: SavedObjectsImportResponse = {
    success: true,
    errors: [],
    successCount: 0,
    warnings: [],
  };

  if (!actionConnectors.length) return importResult;
  let actionConnectorsToImport: SavedObject[] = actionConnectors;
  let storedActionConnectors: ActionResult[] | [] = [];

  const actionConnectorIds = actionConnectors.map(({ id }) => id);
  try {
    // getBulk throws 404 error if the saved_oject wasn't found
    storedActionConnectors = await actionsClient.getBulk(actionConnectorIds);
  } catch (error) {
    // TODO ask if there's a better way
    if (error.output.statusCode === 400) storedActionConnectors = [];
  }

  if (storedActionConnectors.length)
    actionConnectorsToImport = actionConnectors.filter(
      ({ id }) => !storedActionConnectors.find((stored) => stored.id === id)
    );

  if (!actionConnectorsToImport.length) return importResult;

  const readStream = Readable.from(actionConnectors);

  // TODO add overwrite & createNewCopies based on request query
  const result: SavedObjectsImportResponse = await actionsImporter.import({
    readStream,
    overwrite: false,
    createNewCopies: false,
  });

  // TODO map to errorSchema of the rule
  return result;
};
