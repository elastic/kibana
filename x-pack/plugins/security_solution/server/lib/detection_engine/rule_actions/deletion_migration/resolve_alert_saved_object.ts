/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClient, SavedObject, Logger } from '../../../../../../../../src/core/server';
import { Alerting } from './types';

export const resolveAlertSavedObject = async ({
  savedObjectsClient,
  ruleAlertId,
  logger,
}: {
  logger: Logger;
  savedObjectsClient: SavedObjectsClient;
  ruleAlertId: string;
}): Promise<SavedObject<Alerting> | undefined> => {
  try {
    const alert = await savedObjectsClient.resolve<Alerting>('alert', ruleAlertId);
    logger.info(
      `The alert resolution for alert id: "${ruleAlertId}" is outcome: "${alert.outcome}". The id returned with the saved_object is: ${alert.saved_object.id}`
    );
    return alert.saved_object;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '(unknown)';
    logger.error(
      `This alert tied to the side car actions was not found ${ruleAlertId}, no migration will be attempted for this side car action. Error Message: ${errorMessage}`
    );
    return undefined;
  }
};
