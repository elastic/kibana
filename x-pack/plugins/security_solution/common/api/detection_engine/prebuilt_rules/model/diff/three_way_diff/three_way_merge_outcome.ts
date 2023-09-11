/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Type of result of an automatic three-way merge of three values:
 *   - base version
 *   - current version
 *   - target version
 */
export enum ThreeWayMergeOutcome {
  /** Took current version and returned as the merged one. */
  Current = 'CURRENT',

  /** Took target version and returned as the merged one. */
  Target = 'TARGET',

  /** Merged three versions successfully into a new one. */
  Merged = 'MERGED',

  /** Couldn't merge three versions because of a conflict. */
  Conflict = 'CONFLICT',
}
