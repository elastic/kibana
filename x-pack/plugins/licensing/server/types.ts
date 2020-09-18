/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable } from 'rxjs';
import { ILegacyClusterClient } from 'src/core/server';
import { ILicense, LicenseStatus, LicenseType } from '../common/types';
import { FeatureUsageServiceSetup, FeatureUsageServiceStart } from './services';

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

/**
 * The APIs exposed on the `licensing` key of {@link RequestHandlerContext} for plugins that depend on licensing.
 * @public
 */
export interface LicensingRequestHandlerContext {
  featureUsage: FeatureUsageServiceStart;
  license: ILicense;
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    licensing: LicensingRequestHandlerContext;
  }
}

/** @public */
export interface LicensingPluginSetup {
  /**
   * Steam of licensing information {@link ILicense}.
   * @deprecated in favour of the counterpart provided from start contract
   */
  license$: Observable<ILicense>;
  /**
   * Triggers licensing information re-fetch.
   * @deprecated in favour of the counterpart provided from start contract
   */
  refresh(): Promise<ILicense>;
  /**
   * Creates a license poller to retrieve a license data with.
   * Allows a plugin to configure a cluster to retrieve data from at
   * given polling frequency.
   * @deprecated in favour of the counterpart provided from start contract
   */
  createLicensePoller: (
    clusterClient: ILegacyClusterClient,
    pollingFrequency: number
  ) => { license$: Observable<ILicense>; refresh(): Promise<ILicense> };
  /**
   * APIs to register licensed feature usage.
   */
  featureUsage: FeatureUsageServiceSetup;
}

/** @public */
export interface LicensingPluginStart {
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
    clusterClient: ILegacyClusterClient,
    pollingFrequency: number
  ) => { license$: Observable<ILicense>; refresh(): Promise<ILicense> };
  /**
   * APIs to manage licensed feature usage.
   */
  featureUsage: FeatureUsageServiceStart;
}
