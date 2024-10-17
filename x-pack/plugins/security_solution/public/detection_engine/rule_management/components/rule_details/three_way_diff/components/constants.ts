/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableAllFields } from '../../../../../../../common/api/detection_engine';

type NonEditableFields = Readonly<Set<keyof DiffableAllFields>>;

/* These fields are not visible in the comparison UI and are not editable */
export const HIDDEN_FIELDS: NonEditableFields = new Set([
  'alert_suppression',
  'author',
  'rule_id',
  'license',
  'version',
]);
