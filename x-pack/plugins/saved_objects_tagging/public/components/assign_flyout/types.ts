/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type AssignmentStatus = 'full' | 'none' | 'partial';
export type AssignmentOverride = 'selected' | 'deselected';

export type AssignmentStatusMap = Record<string, AssignmentStatus>;
export type AssignmentOverrideMap = Record<string, AssignmentOverride>;
