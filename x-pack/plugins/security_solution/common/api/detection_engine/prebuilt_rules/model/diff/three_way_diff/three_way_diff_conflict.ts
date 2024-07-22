/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enum of possible conflict outcomes of a three-way diff:
 *   - NON_SOLVABLE_CONFLICT: current != target and we couldn't automatically resolve the conflict between them
 *   - SOLVABLE_CONFLICT: current != target and we automatically resolved the conflict between them
 *   - NO_CONFLICT:
 *       - current == target (value won't change)
 *       - current != target && current == base (stock rule will get a new value)
 *
 */
export enum ThreeWayDiffConflict {
  NONE = 'NONE',
  SOLVABLE = 'SOLVABLE',
  NON_SOLVABLE = 'NON_SOLVABLE',
}
