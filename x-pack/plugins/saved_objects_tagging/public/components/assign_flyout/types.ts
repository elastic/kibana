/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * The assignment status of an object against a list of tags
 * - `full`: the object is assigned to all tags
 * - `none`: the object is not assigned to any tag
 * - `partial`: the object is assigned to some, but not all, tags
 */
export type AssignmentStatus = 'full' | 'none' | 'partial';
/**
 * The assignment override performed by the user in the UI
 * - `selected`: user selected an object that was previously unselected
 * - `deselected`: user deselected an object that was previously selected
 */
export type AssignmentOverride = 'selected' | 'deselected';
/**
 * The final action that was performed on a given object regarding tags assignment
 * - `added`: the object was previously in status `none` or `partial` and got selected
 * - `removed`: the object was previously in status `full` or `partial` and got deselected
 * - `unchanged`: the object wasn't changed, or the new status matches the initial one
 */
export type AssignmentAction = 'added' | 'removed' | 'unchanged';

export type AssignmentStatusMap = Record<string, AssignmentStatus>;
export type AssignmentOverrideMap = Record<string, AssignmentOverride>;
