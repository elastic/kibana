/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiffableCommonFields } from '../../../../../common/api/detection_engine';
import type { NonUpgradeableDiffableFields } from './types';

export const NON_UPGRADEABLE_DIFFABLE_FIELDS = [
  'author',
  'license',
  'rule_id',
  'type',
  'version',
] as const;

export const COMMON_FIELD_NAMES = DiffableCommonFields.keyof().options;

export function isCommonFieldName(fieldName: string): fieldName is keyof DiffableCommonFields {
  return (COMMON_FIELD_NAMES as string[]).includes(fieldName);
}

export function inNonUpgradeableFieldName(
  fieldName: string
): fieldName is NonUpgradeableDiffableFields {
  return (NON_UPGRADEABLE_DIFFABLE_FIELDS as Readonly<string[]>).includes(fieldName);
}
