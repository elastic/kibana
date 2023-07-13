/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JobId } from '@kbn/reporting-common/export_types';
import type { SerializableRecord } from '@kbn/utility-types';

type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;

export interface LocatorParams<P extends SerializableRecord = SerializableRecord> {
  id: string;

  /**
   * Kibana version used to create the params
   */
  version: string;

  /**
   * Data to recreate the user's state in the application
   */
  params: P;
}

export type IlmPolicyMigrationStatus = 'policy-not-found' | 'indices-not-managed-by-policy' | 'ok';

export interface IlmPolicyStatusResponse {
  status: IlmPolicyMigrationStatus;
}

type Url = string;
type UrlLocatorTuple = [url: Url, locatorParams: LocatorParams];

export type UrlOrUrlLocatorTuple = Url | UrlLocatorTuple;
