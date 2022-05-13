/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from '@kbn/core/server';
import { getSavedObjectReferenceForDataView } from './utils';

/**
 * This injects any "exceptionsList" "id"'s from saved object reference and returns the "exceptionsList" using the saved object reference. If for
 * some reason it is missing on saved object reference, we log an error about it and then take the last known good value from the "exceptionsList"
 *
 * @param logger The kibana injected logger
 * @param exceptionsList The exceptions list to merge the saved object reference from.
 * @param savedObjectReferences The saved object references which should contain an "exceptionsList"
 * @returns The exceptionsList with the saved object reference replacing any value in the saved object's id.
 */
export const injectDataViewReferences = ({
  logger,
  savedObjectReferences,
}: {
  logger: Logger;
  savedObjectReferences: SavedObjectReference[];
}): string | null | undefined => {
  const foundSavedObject = getSavedObjectReferenceForDataView({
    logger,
    savedObjectReferences,
  });
  if (foundSavedObject != null) {
    const reference = foundSavedObject.id;
    return reference;
  } else {
    logger.error('the saved object references for data view id were not found on this rule');
    return '';
  }
};
