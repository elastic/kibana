/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import { pick } from 'lodash';
import type { RuleToImport } from '../../../../../../../common/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/detection_engine/schemas/response';
import {
  handleActionsHaveNoConnectors,
  mapSOErrorToRuleError,
  returnErroredImportResult,
} from './utils';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';

const getActionConnectorRules = (rules: Array<RuleToImport | Error>) =>
  rules.reduce((acc: { [actionsIds: string]: string[] }, rule) => {
    if (rule instanceof Error) return acc;
    rule.actions?.forEach(({ id }) => (acc[id] = [...(acc[id] || []), rule.rule_id]));
    return acc;
  }, {});

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

    const ruleIds: string = [...new Set(...Object.values(actionsIds))].join();

    if (overwrite && !actionConnectors.length)
      return handleActionsHaveNoConnectors(actionsIds, ruleIds);

    let actionConnectorsToImport: SavedObject[] = actionConnectors;
    if (!overwrite) {
      const storedActionIds: string[] = await (await actionsClient.getAll()).map(({ id }) => id);

      const newIdsToAdd = actionsIds.filter((id) => !storedActionIds.includes(id));

      // if new action-connectors don't have exported connectors will fail with missing
      if (actionConnectors.length < newIdsToAdd.length) {
        const actionConnectorsIds = actionConnectors.map(({ id }) => id);
        const missingActionConnector = newIdsToAdd.filter(
          (id) => !actionConnectorsIds.includes(id)
        );
        const missingActionRules = pick(actionConnectorRules, [...missingActionConnector]);

        const missingRuleIds: string = [...new Set(...Object.values(missingActionRules))].join();

        return handleActionsHaveNoConnectors(missingActionConnector, missingRuleIds);
      }
      // Incase connectors imported before
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
