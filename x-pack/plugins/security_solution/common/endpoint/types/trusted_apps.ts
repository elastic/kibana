/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  ConditionEntryField,
  OperatingSystem,
  TrustedAppEntryTypes,
} from '@kbn/securitysolution-utils';
import type { PutTrustedAppUpdateRequestSchema } from '../schema/trusted_apps';
import type { ConditionEntry } from './exception_list_items';
export interface GetTrustedAppsListResponse {
  per_page: number;
  page: number;
  total: number;
  data: TrustedApp[];
}

/** API request params for updating a Trusted App */
export type PutTrustedAppsRequestParams = TypeOf<typeof PutTrustedAppUpdateRequestSchema.params>;

export enum OperatorFieldIds {
  is = 'is',
  matches = 'matches',
}

export interface TrustedAppConditionEntry<T extends ConditionEntryField = ConditionEntryField>
  extends ConditionEntry {
  field: T;
  type: TrustedAppEntryTypes;
  operator: 'included';
  value: string;
}

export type MacosLinuxConditionEntry = TrustedAppConditionEntry<
  ConditionEntryField.HASH | ConditionEntryField.PATH
>;
export type WindowsConditionEntry = TrustedAppConditionEntry<
  ConditionEntryField.HASH | ConditionEntryField.PATH | ConditionEntryField.SIGNER
>;

export interface MacosLinuxConditionEntries {
  os: OperatingSystem.LINUX | OperatingSystem.MAC;
  entries: MacosLinuxConditionEntry[];
}

export interface WindowsConditionEntries {
  os: OperatingSystem.WINDOWS;
  entries: WindowsConditionEntry[];
}

export interface GlobalEffectScope {
  type: 'global';
}

export interface PolicyEffectScope {
  type: 'policy';
  /** An array of Endpoint Integration Policy UUIDs */
  policies: string[];
}

export type EffectScope = GlobalEffectScope | PolicyEffectScope;

/** Type for a new Trusted App Entry */
export type NewTrustedApp = {
  name: string;
  description?: string;
  effectScope: EffectScope;
} & (MacosLinuxConditionEntries | WindowsConditionEntries);

/** A trusted app entry */
export type TrustedApp = NewTrustedApp & {
  version: string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};
