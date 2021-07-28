/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

export const logWarningIfDifferentReferencesDetected = (
  logger: Logger,
  savedObjectReferenceId: string,
  savedObjectId: string
): void => {
  if (savedObjectReferenceId !== savedObjectId) {
    logger.warn(
      [
        'The id of the saved object reference: ',
        savedObjectReferenceId,
        'is not the same as the saved object id: ',
        savedObjectId,
        'Preferring and using the saved object reference id instead of the saved object id',
      ].join('')
    );
  }
};
