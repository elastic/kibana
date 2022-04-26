/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeOf } from '@kbn/config-schema';
import {
  ConditionEntryField,
  OperatingSystem,
  TrustedAppEntryTypes,
} from '@kbn/securitysolution-utils';
import {
  DeleteTrustedAppsRequestSchema,
  GetOneTrustedAppRequestSchema,
  GetTrustedAppsRequestSchema,
  PostTrustedAppCreateRequestSchema,
  PutTrustedAppUpdateRequestSchema,
  GetTrustedAppsSummaryRequestSchema,
} from '../schema/trusted_apps';
import { ConditionEntry } from './exception_list_items';

/** API request params for deleting Trusted App entry */
export type DeleteTrustedAppsRequestParams = TypeOf<typeof DeleteTrustedAppsRequestSchema.params>;

export type GetOneTrustedAppRequestParams = TypeOf<typeof GetOneTrustedAppRequestSchema.params>;

export interface GetOneTrustedAppResponse {
  data: TrustedApp;
}

/** API request params for retrieving a list of Trusted Apps */
export type GetTrustedAppsListRequest = TypeOf<typeof GetTrustedAppsRequestSchema.query>;

/** API request params for retrieving summary of Trusted Apps */
export type GetTrustedAppsSummaryRequest = TypeOf<typeof GetTrustedAppsSummaryRequestSchema.query>;

export interface GetTrustedAppsListResponse {
  per_page: number;
  page: number;
  total: number;
  data: TrustedApp[];
}

/*
 * API Request body for creating a new Trusted App entry
 * As this is an inferred type and the schema type doesn't match at all with the
 * NewTrustedApp type it needs and overwrite from the MacosLinux/Windows custom types
 */
export type PostTrustedAppCreateRequest = TypeOf<typeof PostTrustedAppCreateRequestSchema.body> &
  (MacosLinuxConditionEntries | WindowsConditionEntries);

export interface PostTrustedAppCreateResponse {
  data: TrustedApp;
}

/** API request params for updating a Trusted App */
export type PutTrustedAppsRequestParams = TypeOf<typeof PutTrustedAppUpdateRequestSchema.params>;

/** API Request body for Updating a new Trusted App entry */
export type PutTrustedAppUpdateRequest = TypeOf<typeof PutTrustedAppUpdateRequestSchema.body> &
  (MacosLinuxConditionEntries | WindowsConditionEntries);

export type PutTrustedAppUpdateResponse = PostTrustedAppCreateResponse;

export interface GetTrustedAppsSummaryResponse {
  total: number;
  windows: number;
  macos: number;
  linux: number;
}

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

/** An Update to a Trusted App Entry */
export type UpdateTrustedApp = NewTrustedApp & {
  version?: string;
};

/** A trusted app entry */
export type TrustedApp = NewTrustedApp & {
  version: string;
  id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
};
