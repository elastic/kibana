/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SolutionView } from '../../../common';

const SPACE_SOLUTION: SolutionView[] = ['classic', 'es', 'oblt', 'security'];

export const isValidSpaceSolution = (solution: unknown) => {
  if (SPACE_SOLUTION.includes(solution as SolutionView)) {
    return true;
  }
  return false;
};
