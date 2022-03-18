/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConditionEntryField, EntryTypes } from '@kbn/securitysolution-utils';

export type ConditionEntriesMap<T> = {
  [K in ConditionEntryField]?: T;
};

export interface ConditionEntry<
  F extends ConditionEntryField = ConditionEntryField,
  T extends EntryTypes = EntryTypes
> {
  field: F;
  type: T;
  operator: 'included';
  value: string | string[];
}
