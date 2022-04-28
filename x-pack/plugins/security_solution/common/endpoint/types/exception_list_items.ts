/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllConditionEntryFields, EntryTypes } from '@kbn/securitysolution-utils';

export type ConditionEntriesMap<T> = {
  [K in AllConditionEntryFields]?: T;
};

export interface ConditionEntry<T extends EntryTypes = EntryTypes> {
  field: AllConditionEntryFields;
  type: T;
  operator: 'included';
  value: string | string[];
}
