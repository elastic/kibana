/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from 'src/core/server';
import { RuleParams } from '../../../schemas/rule_schemas';

export const createExceptionReference = (
  logger: Logger,
  exceptionItem: RuleParams['exceptionsList'][0],
  savedObjectReference: SavedObjectReference
): RuleParams['exceptionsList'][0] => {
  const reference: RuleParams['exceptionsList'][0] = {
    ...exceptionItem,
    id: savedObjectReference.id,
  };
  return reference;
};
