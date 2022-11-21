/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a result of an abstract three-way diff/merge operation on a value
 * (could be a whole rule JSON or a given rule field).
 *
 * Typical situations:
 *
 * 1. base=A, current=A, incoming=A => merged=A, conflict=false
 *    Stock rule, the value hasn't changed.
 *
 * 2. base=A, current=A, incoming=B => merged=B, conflict=false
 *    Stock rule, the value has changed.
 *
 * 3. base=A, current=B, incoming=A => merged=B, conflict=false
 *    Customized rule, the value hasn't changed.
 *
 * 4. base=A, current=B, incoming=B => merged=B, conflict=false
 *    Customized rule, the value has changed exactly the same way as in the user customization.
 *
 * 5. base=A, current=B, incoming=C => merged=D, conflict=false
 *    Customized rule, the value has changed, conflict between B and C resolved automatically.
 *
 * 6. base=A, current=B, incoming=C => merged=C, conflict=true
 *    Customized rule, the value has changed, conflict between B and C couldn't be resolved automatically.
 */
export interface ThreeWayDiff<TValue> {
  /**
   * Corresponds to the stock version of the currently installed prebuilt rule.
   */
  baseVersion: TValue;

  /**
   * Corresponds exactly to the currently installed prebuilt rule:
   *   - to the customized version (if it's customized)
   *   - to the stock version (if it's not customized)
   */
  currentVersion: TValue;

  /**
   * Corresponds to the "new" stock version that the user is trying to upgrade to.
   */
  incomingVersion: TValue;

  /**
   * The result of an automatic three-way merge of three values:
   *   - base version
   *   - current version
   *   - incoming version
   *
   * Exact merge algorithm depends on the value:
   *   - one algo could be used for single-line strings and keywords (e.g. rule name)
   *   - another one could be used for multiline text (e.g. rule description)
   *   - another one could be used for arrays of keywords (e.g. rule tags)
   *   - another one could be used for the MITRE ATT&CK data structure
   *   - etc
   *
   * Merged version always has a value. We do our best to resolve conflicts automatically.
   * If they can't be resolved automatically, merged version is equal to incoming version.
   */
  mergedVersion: TValue;

  /**
   * True if:
   *   - current != incoming and we couldn't automatically resolve the conflict between them
   *
   * False if:
   *   - current == incoming (value won't change)
   *   - current != incoming && current == base (stock rule will get a new value)
   *   - current != incoming and we automatically resolved the conflict between them
   */
  hasConflict: boolean;
}
