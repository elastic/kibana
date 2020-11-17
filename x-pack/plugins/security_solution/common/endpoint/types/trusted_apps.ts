/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { ApplicationStart } from 'kibana/public';
import {
  DeleteTrustedAppsRequestSchema,
  GetTrustedAppsRequestSchema,
  PostTrustedAppCreateRequestSchema,
} from '../schema/trusted_apps';
import { Linux, MacOS, Windows } from './os';

/** API request params for deleting Trusted App entry */
export type DeleteTrustedAppsRequestParams = TypeOf<typeof DeleteTrustedAppsRequestSchema.params>;

/** API request params for retrieving a list of Trusted Apps */
export type GetTrustedAppsListRequest = TypeOf<typeof GetTrustedAppsRequestSchema.query>;

export interface GetTrustedListAppsResponse {
  per_page: number;
  page: number;
  total: number;
  data: TrustedApp[];
}

/** API Request body for creating a new Trusted App entry */
export type PostTrustedAppCreateRequest = TypeOf<typeof PostTrustedAppCreateRequestSchema.body>;

export interface PostTrustedAppCreateResponse {
  data: TrustedApp;
}

export enum ConditionEntryField {
  HASH = 'process.hash.*',
  PATH = 'process.executable.caseless',
  SIGNER = 'process.Ext.code_signature',
}

export interface ConditionEntry<T extends ConditionEntryField> {
  field: T;
  type: 'match';
  operator: 'included';
  value: string;
}

export type MacosLinuxConditionEntry = ConditionEntry<
  ConditionEntryField.HASH | ConditionEntryField.PATH
>;
export type WindowsConditionEntry = ConditionEntry<
  ConditionEntryField.HASH | ConditionEntryField.PATH | ConditionEntryField.SIGNER
>;

export interface MacosLinuxConditionEntries {
  os: Linux | MacOS;
  entries: MacosLinuxConditionEntry[];
}

export interface WindowsConditionEntries {
  os: Windows;
  entries: WindowsConditionEntry[];
}

/** Type for a new Trusted App Entry */
export type NewTrustedApp = {
  name: string;
  description?: string;
} & (MacosLinuxConditionEntries | WindowsConditionEntries);

/** A trusted app entry */
export type TrustedApp = NewTrustedApp & {
  id: string;
  created_at: string;
  created_by: string;
};

/**
 * Supported React-Router state for the Trusted Apps List page
 */
export interface TrustedAppsListPageRouteState {
  /** Where the user should be redirected to when the `Back` button is clicked */
  onBackButtonNavigateTo: Parameters<ApplicationStart['navigateToApp']>;
  /** The URL for the `Back` button */
  backButtonUrl?: string;
  /** The label for the button */
  backButtonLabel?: string;
}
