/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import { RuleAttributes } from '../types';

export interface MuteAlertSoParams {
  savedObjectsClient: SavedObjectsClientContract;
  savedObjectsUpdateOptions: SavedObjectsUpdateOptions;
  alertId: string;
  alertAttributes: Partial<RuleAttributes>;
}

export const muteAlertSo = ({
  savedObjectsClient,
  savedObjectsUpdateOptions: { version },
  alertId,
  alertAttributes,
}: MuteAlertSoParams): Promise<SavedObjectsUpdateResponse<RuleAttributes>> => {
  return savedObjectsClient.update('alert', alertId, alertAttributes, { version });
};
