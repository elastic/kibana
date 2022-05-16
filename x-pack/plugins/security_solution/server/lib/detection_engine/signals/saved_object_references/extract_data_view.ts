/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectReference } from '@kbn/core/server';
import {
  EqlRuleParams,
  QueryRuleParams,
  ThreatRuleParams,
  ThresholdRuleParams,
} from '../../schemas/rule_schemas';

/**
 * This extracts the "exceptionsList" "id" and returns it as a saved object reference.
 * NOTE: Due to rolling upgrades with migrations and a few bugs with migrations, I do an additional check for if "exceptionsList" exists or not. Once
 * those bugs are fixed, we can remove the "if (exceptionsList == null) {" check, but for the time being it is there to keep things running even
 * if exceptionsList has not been migrated.
 * @param logger The kibana injected logger
 * @param exceptionsList The exceptions list to get the id from and return it as a saved object reference.
 * @returns The saved object references from the exceptions list
 */
export const extractDataView = ({
  logger,
  dataViewId,
}: {
  logger: Logger;
  dataViewId:
    | ThresholdRuleParams['dataViewId']
    | ThreatRuleParams['dataViewId']
    | QueryRuleParams['dataViewId']
    | EqlRuleParams['dataViewId']
    | undefined
    | null;
}): SavedObjectReference[] => {
  if (dataViewId == null) {
    logger.error('Data View Id is null returning empty saved object reference');
    return [];
  } else {
    return [
      {
        name: 'dataViewId_0',
        id: dataViewId,
        type: 'index-pattern',
      },
    ];
  }
};
