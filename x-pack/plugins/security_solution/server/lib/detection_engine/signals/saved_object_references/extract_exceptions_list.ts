/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectReference } from '@kbn/core/server';
import { getSavedObjectType } from '@kbn/securitysolution-list-utils';
import type { RuleParams } from '../../rule_schema';
import { getSavedObjectNamePatternForExceptionsList } from './utils';

/**
 * This extracts the "exceptionsList" "id" and returns it as a saved object reference.
 * NOTE: Due to rolling upgrades with migrations and a few bugs with migrations, I do an additional check for if "exceptionsList" exists or not. Once
 * those bugs are fixed, we can remove the "if (exceptionsList == null) {" check, but for the time being it is there to keep things running even
 * if exceptionsList has not been migrated.
 * @param logger The kibana injected logger
 * @param exceptionsList The exceptions list to get the id from and return it as a saved object reference.
 * @returns The saved object references from the exceptions list
 */
export const extractExceptionsList = ({
  logger,
  exceptionsList,
}: {
  logger: Logger;
  exceptionsList: RuleParams['exceptionsList'];
}): SavedObjectReference[] => {
  if (exceptionsList == null) {
    logger.error(
      'Exception list is null when it never should be. This indicates potentially that saved object migrations did not run correctly. Returning empty saved object reference'
    );
    return [];
  } else {
    return exceptionsList.map((exceptionItem, index) => ({
      name: getSavedObjectNamePatternForExceptionsList(index),
      id: exceptionItem.id,
      type: getSavedObjectType({ namespaceType: exceptionItem.namespace_type }),
    }));
  }
};
