/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STEP_DESCRIPTIONS } from './constants';

export const getStepDescription = (precision: number) => {
  // Precision steps are 1-11
  // STEP_DESCRIPTIONS is indexed 0-10
  const descriptionIndex = precision - 1;
  return STEP_DESCRIPTIONS[descriptionIndex];
};
