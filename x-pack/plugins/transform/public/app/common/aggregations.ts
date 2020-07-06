/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { composeValidators, patternValidator } from '../../../../ml/public';

export type AggName = string;

export function isAggName(arg: any): arg is AggName {
  // allow all characters except `[]>` and must not start or end with a space.
  const validatorFn = composeValidators(
    patternValidator(/^[^\s]/),
    patternValidator(/[^\s]$/),
    patternValidator(/^[^\[\]>]+$/)
  );
  return validatorFn(arg) === null;
}
