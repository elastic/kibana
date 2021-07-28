/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from 'src/core/server';
import { RuleParams } from '../../schemas/rule_schemas';
import {
  createExceptionReference,
  getSavedObjectReferenceForExceptionsList,
  logMissingSavedObjectError,
  logWarningIfDifferentReferencesDetected,
} from './utils';

export const injectExceptionsReferences = (
  logger: Logger,
  exceptionsList: RuleParams['exceptionsList'],
  savedObjectReferences: SavedObjectReference[]
): RuleParams['exceptionsList'] => {
  return exceptionsList.map((exceptionItem, index) => {
    const savedObjectReference = getSavedObjectReferenceForExceptionsList(
      index,
      savedObjectReferences
    );
    if (savedObjectReference != null) {
      logWarningIfDifferentReferencesDetected(logger, savedObjectReference.id, exceptionItem.id);
      return createExceptionReference(logger, exceptionItem, savedObjectReference);
    } else {
      logMissingSavedObjectError(logger, exceptionItem);
      return exceptionItem;
    }
  });
};
