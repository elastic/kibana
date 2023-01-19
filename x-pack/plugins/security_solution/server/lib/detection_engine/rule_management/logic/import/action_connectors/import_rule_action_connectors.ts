/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { ActionResult } from '@kbn/actions-plugin/server';
import type { SavedObject, SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { WarningSchema } from '../../../../../../../common/detection_engine/schemas/response';
import { mapSOErrorToRuleError } from './validate_action_connectors_import_result';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';

export const importRuleActionConnectors = async ({
  actionConnectors,
  actionsClient,
  actionsImporter,
  overwrite,
}: ImportRuleActionConnectorsParams): Promise<ImportRuleActionConnectorsResult> => {
  const importResult: ImportRuleActionConnectorsResult = {
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

  if (!actionConnectorsToImport.length && !overwrite) return importResult;

  const readStream = Readable.from(actionConnectors);

  const { success, successCount, successResults, warnings, errors }: SavedObjectsImportResponse =
    await actionsImporter.import({
      readStream,
      overwrite,
      createNewCopies: false,
    });

  return {
    success,
    successCount,
    successResults,
    errors: mapSOErrorToRuleError(errors) || [],
    warnings: (warnings as WarningSchema[]) || [],
  };
};
