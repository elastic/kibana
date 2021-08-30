/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

/**
 * This will log a warning that the saved object reference id and the saved object id are not the same if that is true.
 * @param logger The kibana injected logger
 * @param savedObjectReferenceId The saved object reference id from "references: [{ id: ...}]"
 * @param savedObjectId The saved object id from a structure such as exceptions { exceptionsList: { "id": "..." } }
 */
export const logWarningIfDifferentReferencesDetected = ({
  logger,
  savedObjectReferenceId,
  savedObjectId,
}: {
  logger: Logger;
  savedObjectReferenceId: string;
  savedObjectId: string;
}): void => {
  if (savedObjectReferenceId !== savedObjectId) {
    logger.error(
      [
        'The id of the "saved object reference id": ',
        savedObjectReferenceId,
        ' is not the same as the "saved object id": ',
        savedObjectId,
        '. Preferring and using the "saved object reference id" instead of the "saved object id"',
      ].join('')
    );
  }
};
