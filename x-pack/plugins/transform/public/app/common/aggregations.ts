/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { composeValidators, patternValidator } from '@kbn/ml-validators';

import type { AggName } from '../../../common/types/aggregations';

export function isAggName(arg: unknown): arg is AggName {
  // allow all characters except `[]>` and must not start or end with a space.
  const validatorFn = composeValidators(
    patternValidator(/^[^\s]/),
    patternValidator(/[^\s]$/),
    patternValidator(/^[^\[\]>]+$/)
  );
  return validatorFn(arg) === null;
}
