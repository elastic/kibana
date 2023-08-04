/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';

import type { RuleToImport } from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import {
  checkIfActionsHaveMissingConnectors,
  filterExistingActionConnectors,
  getActionConnectorRules,
  handleActionsHaveNoConnectors,
  mapSOErrorToRuleError,
  returnErroredImportResult,
  updateRuleActionsWithMigratedResults,
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
    /*
      // When a connector is exported from one namespace and imported to another, it does not result in an error, but instead a new object is created with
      // new destination id and id will have the old  origin id, so in order to be able to use the newly generated Connectors id, this util is used to swap the old id with the
      // new destination Id
      */
    let rulesWithMigratedActions: Array<RuleToImport | Error> | undefined;
    if (successResults?.some((res) => res.destinationId))
      rulesWithMigratedActions = updateRuleActionsWithMigratedResults(rules, successResults);

    return {
      success,
      successCount,
      errors: errors ? mapSOErrorToRuleError(errors) : [],
      warnings: (warnings as WarningSchema[]) || [],
      rulesWithMigratedActions,
    };
  } catch (error) {
    return returnErroredImportResult(error);
  }
};
