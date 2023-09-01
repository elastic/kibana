/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISavedObjectsImporter, SavedObject } from '@kbn/core-saved-objects-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsImportFailure } from '@kbn/core-saved-objects-common';
import type { RuleToImport } from '../../../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../../../common/api/detection_engine';
import type { BulkError } from '../../../../routes/utils';

export interface ImportRuleActionConnectorsResult {
  success: boolean;
  successCount: number;
  errors: BulkError[] | [];
  warnings: WarningSchema[] | [];
  rulesWithMigratedActions?: Array<RuleToImport | Error>;
}

export interface ImportRuleActionConnectorsParams {
  actionConnectors: SavedObject[];
  actionsClient: ActionsClient;
  actionsImporter: ISavedObjectsImporter;
  rules: Array<RuleToImport | Error>;
  overwrite: boolean;
}

export interface SOError {
  output: { statusCode: number; payload: { message: string } };
}

export interface ConflictError {
  type: string;
}

export type ErrorType = SOError | ConflictError | SavedObjectsImportFailure | Error;
export interface ActionRules {
  [actionsIds: string]: string[];
}
