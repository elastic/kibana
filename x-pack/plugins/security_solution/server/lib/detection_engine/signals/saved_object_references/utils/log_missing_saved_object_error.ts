/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import { RuleParams } from '../../../schemas/rule_schemas';

export const logMissingSavedObjectError = (
  logger: Logger,
  exceptionItem: RuleParams['exceptionsList'][0]
): void => {
  logger.warn(
    [
      'The saved object references were not found for our exception list when we were expecting to find it. Kibana migrations might not have run correctly or someone might have removed it manually.',
      'Returning the last known good exception list id which might not work.',
      JSON.stringify(exceptionItem),
    ].join()
  );
};
