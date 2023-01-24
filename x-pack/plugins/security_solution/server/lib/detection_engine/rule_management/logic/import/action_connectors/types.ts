/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ISavedObjectsImporter, SavedObject } from '@kbn/core-saved-objects-server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { SavedObjectsImportSuccess } from '@kbn/core-saved-objects-common';
import type { WarningSchema } from '../../../../../../../common/detection_engine/schemas/response';
import type { BulkError } from '../../../../routes/utils';

export interface ImportRuleActionConnectorsResult {
  success: boolean;
  successCount: number;
  successResults?: SavedObjectsImportSuccess[];
  errors: BulkError[] | [];
  warnings: WarningSchema[] | [];
}

export interface ImportRuleActionConnectorsParams {
  actionConnectors: SavedObject[];
  actionsClient: ActionsClient;
  actionsImporter: ISavedObjectsImporter;
  actionsIds: string[];
  overwrite: boolean;
}
