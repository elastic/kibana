/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { IClusterClient } from 'src/core/server';
import { ILicense, LicenseStatus, LicenseType } from '../common/types';

export interface ElasticsearchError extends Error {
  status?: number;
}
/**
 * Result from remote request fetching raw feature set.
 * @internal
 */
export interface RawFeature {
  available: boolean;
  enabled: boolean;
}

/**
 * Results from remote request fetching raw feature sets.
 * @internal
 */
export interface RawFeatures {
  [key: string]: RawFeature;
}

/**
 * Results from remote request fetching a raw license.
 * @internal
 */
export interface RawLicense {
  uid: string;
  status: LicenseStatus;
  expiry_date_in_millis: number;
  type: LicenseType;
  mode: LicenseType;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    licensing: {
      license: ILicense;
    };
  }
}

/** @public */
export interface LicensingPluginSetup {
  /**
   * Steam of licensing information {@link ILicense}.
   */
  license$: Observable<ILicense>;
  /**
   * Triggers licensing information re-fetch.
   */
  refresh(): Promise<ILicense>;

  /**
   * Creates a license poller to retrieve a license data with.
   * Allows a plugin to configure a cluster to retrieve data from at
   * given polling frequency.
   */
  createLicensePoller: (
    clusterClient: IClusterClient,
    pollingFrequency: number
  ) => { license$: Observable<ILicense>; refresh(): Promise<ILicense> };
}
