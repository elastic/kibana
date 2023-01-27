/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Readable } from 'stream';

import type { ActionResult } from '@kbn/actions-plugin/server';
import type { SavedObjectsImportResponse } from '@kbn/core-saved-objects-common';
import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { RuleToImport } from '../../../../../../../common/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/detection_engine/schemas/response';
import { mapSOErrorToRuleError } from './validate_action_connectors_import_result';
import type { ImportRuleActionConnectorsParams, ImportRuleActionConnectorsResult } from './types';
import type { BulkError } from '../../../../routes/utils';
import { createBulkErrorObject } from '../../../../routes/utils';

const checkIfActionsHaveNoConnectors = (
  actionsIds: string[],
  ruleIds: string
): ImportRuleActionConnectorsResult => {
  if (actionsIds && actionsIds.length) {
    const errors: BulkError[] = [];
    const errorMessage =
      actionsIds.length > 1
        ? 'connectors are missing. Connector ids missing are:'
        : 'connector is missing. Connector id missing is:';
    errors.push(
      createBulkErrorObject({
        statusCode: 404,
        message: `${actionsIds.length} ${errorMessage} ${actionsIds.join(', ')}`,
        ruleId: ruleIds,
      })
    );
    return {
      success: false,
      errors,
      successCount: 0,
      warnings: [],
    };
  }
  return {
    success: true,
    errors: [],
    successCount: 0,
    warnings: [],
  };
};

const handleActionConnectorsErrors = (error: {
  output: { statusCode: number; payload: { message: string } };
}): ImportRuleActionConnectorsResult => {
  const statusCode = error?.output.statusCode;
  const message = error.output.payload.message;
  if (statusCode === 403)
    return {
      success: false,
      errors: [
        createBulkErrorObject({
          statusCode,
          message: `You may not have actions privileges required to import rules with actions: ${message}`,
        }),
      ],
      successCount: 0,
      warnings: [],
    };

  return {
    success: false,
    errors: [
      createBulkErrorObject({
        statusCode,
        message,
      }),
    ],
    successCount: 0,
    warnings: [],
  };
};
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
  const actionConnectorRules = getActionConnectorRules(rules);
  const actionsIds: string[] = Object.keys(actionConnectorRules);
  const ruleIds: string = [...new Set(...Object.values(actionConnectorRules))].join();

  if (!actionConnectors.length) return checkIfActionsHaveNoConnectors(actionsIds, ruleIds);

  let actionConnectorsToImport: SavedObject[] = actionConnectors;
  let storedActionConnectors: ActionResult[] | [] = [];

  try {
    // getBulk throws 404 error if the saved_oject wasn't found, is there a better
    storedActionConnectors = await actionsClient.getBulk(actionsIds);
  } catch (error) {
    if (error.message.includes('404')) storedActionConnectors = [];
    else return handleActionConnectorsErrors(error);
  }

  if (storedActionConnectors.length)
    actionConnectorsToImport = actionConnectors.filter(
      ({ id }) => !storedActionConnectors.find((stored) => stored.id === id)
    );

  if (!actionConnectorsToImport.length && !overwrite)
    return {
      success: true,
      errors: [],
      successCount: 0,
      warnings: [],
    };
  try {
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
  } catch (error) {
    return handleActionConnectorsErrors(error);
  }
};
