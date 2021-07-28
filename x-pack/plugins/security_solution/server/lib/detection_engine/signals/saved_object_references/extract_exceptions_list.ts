/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from 'src/core/server';
import { EXCEPTION_LIST_NAMESPACE } from '@kbn/securitysolution-list-constants';
import { RuleParams } from '../../schemas/rule_schemas';
import { getSavedObjectNamePatternForExceptionsList } from './utils';

export const extractExceptionsList = (
  logger: Logger,
  exceptionsList: RuleParams['exceptionsList']
): SavedObjectReference[] => {
  if (exceptionsList == null) {
    logger.warn(
      'Exception list is null when it never should be. This indicates potentially that saved object migrations did not run correctly. Returning empty saved object reference'
    );
    return [];
  } else {
    return exceptionsList.map((exceptionItem, index) => ({
      name: getSavedObjectNamePatternForExceptionsList(index),
      id: exceptionItem.id,
      type: EXCEPTION_LIST_NAMESPACE,
    }));
  }
};
