/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOParamsForFE } from '../../../typings';

export function processValues(values: CreateSLOParamsForFE): CreateSLOParamsForFE {
  return { ...values, objective: { target: values.objective.target / 100 } };
}
