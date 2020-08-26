/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TypeOf } from '@kbn/config-schema';
import { GetTrustedAppsRequestSchema } from '../schema/trusted_apps';

/** API request params for retrieving a list of Trusted Apps */
export type GetTrustedAppsListRequest = TypeOf<typeof GetTrustedAppsRequestSchema.query>;
export interface GetTrustedListAppsResponse {
  per_page: number;
  page: number;
  total: number;
  data: TrustedApp[];
}

interface MacosLinuxConditionEntry {
  field: 'hash' | 'path';
  type: 'match';
  operator: 'included';
  value: string;
}

type WindowsConditionEntry =
  | MacosLinuxConditionEntry
  | (Omit<MacosLinuxConditionEntry, 'field'> & {
      field: 'signer';
    });

/** Type for a new Trusted App Entry */
export type NewTrustedApp = {
  name: string;
  description?: string;
} & (
  | {
      os: 'linux' | 'macos';
      entries: MacosLinuxConditionEntry[];
    }
  | {
      os: 'windows';
      entries: WindowsConditionEntry[];
    }
);

/** A trusted app entry */
export type TrustedApp = NewTrustedApp & {
  id: string;
  created_at: string;
  created_by: string;
};
