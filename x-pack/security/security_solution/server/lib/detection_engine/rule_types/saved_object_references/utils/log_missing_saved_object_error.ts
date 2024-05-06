/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RuleParams } from '../../../rule_schema';

type Keys = keyof RuleParams;
type PossibleRuleParamValues = RuleParams[Keys];

/**
 * This will log a warning that we are missing an object reference.
 * @param logger The kibana injected logger
 * @param missingFieldValue The value of the field not found in saved object references
 * @param missingField The name of the field not found in saved object references
 */
export const logMissingSavedObjectError = ({
  logger,
  missingFieldValue,
  missingField,
}: {
  logger: Logger;
  missingFieldValue: PossibleRuleParamValues;
  missingField: string;
}): void => {
  logger.error(
    [
      `The saved object references were not found for our ${missingField} when we were expecting to find it. `,
      'Kibana migrations might not have run correctly or someone might have removed the saved object references manually. ',
      `Returning the last known good ${missingField} which might not work. Value being returned is: `,
      JSON.stringify(missingFieldValue),
    ].join('')
  );
};
