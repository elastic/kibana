/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Enum of possible conflict outcomes of a three-way diff:
 *   - NON_SOLVABLE: current != target and we couldn't automatically resolve the conflict between them
 *   - SOLVABLE: current != target and we automatically resolved the conflict between them
 *   - NO_CONFLICT:
 *       - current == target (value won't change)
 *       - current != target && current == base (stock rule will get a new value)
 * See RFC: https://github.com/elastic/kibana/blob/main/x-pack/plugins/security_solution/docs/rfcs/detection_response/prebuilt_rules_customization.md#concrete-field-diff-algorithms-by-type
 */
export enum ThreeWayDiffConflict {
  NONE = 'NONE',
  SOLVABLE = 'SOLVABLE',
  NON_SOLVABLE = 'NON_SOLVABLE',
}
