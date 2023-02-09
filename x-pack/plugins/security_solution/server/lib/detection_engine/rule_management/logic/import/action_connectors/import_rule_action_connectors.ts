/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';

import type { WarningSchema } from '../../../../../../../common/detection_engine/schemas/response';
import {
  checkIfActionsHaveMissingConnectors,
  filterExistingActionConnectors,
  getActionConnectorRules,
  handleActionsHaveNoConnectors,
  mapSOErrorToRuleError,
  returnErroredImportResult,
} from './utils';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';

export const importRuleActionConnectors = async ({
  actionConnectors,
  actionsClient,
  actionsImporter,
  rules,
  overwrite,
}: ImportRuleActionConnectorsParams): Promise<ImportRuleActionConnectorsResult> => {
  try {
    const actionConnectorRules = getActionConnectorRules(rules);
    const actionsIds: string[] = Object.keys(actionConnectorRules);

    if (!actionsIds.length)
      return {
        success: true,
        errors: [],
        successCount: 0,
        warnings: [],
      };

    if (overwrite && !actionConnectors.length)
      return handleActionsHaveNoConnectors(actionsIds, actionConnectorRules);

    let actionConnectorsToImport: SavedObject[] = actionConnectors;

    if (!overwrite) {
      const newIdsToAdd = await filterExistingActionConnectors(actionsClient, actionsIds);

      const foundMissingConnectors = checkIfActionsHaveMissingConnectors(
        actionConnectors,
        newIdsToAdd,
        actionConnectorRules
      );
      if (foundMissingConnectors) return foundMissingConnectors;
      // filter out existing connectors
      actionConnectorsToImport = actionConnectors.filter(({ id }) => newIdsToAdd.includes(id));
    }
    if (!actionConnectorsToImport.length)
      return {
        success: true,
        errors: [],
        successCount: 0,
        warnings: [],
      };

    const readStream = Readable.from(actionConnectorsToImport);
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
      errors: errors ? mapSOErrorToRuleError(errors) : [],
      warnings: (warnings as WarningSchema[]) || [],
    };
  } catch (error) {
    return returnErroredImportResult(error);
  }
};
