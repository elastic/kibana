/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';
import type { IClusterClient, IRouter, RequestHandlerContext } from '@kbn/core/server';
import { ILicense } from '../common/types';
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
 * The APIs exposed on the `licensing` key of {@link RequestHandlerContext} for plugins that depend on licensing.
 * @public
 */
export interface LicensingApiRequestHandlerContext {
  featureUsage: FeatureUsageServiceStart;
  license: ILicense;
}

/**
 * @internal
 */
export interface LicensingRequestHandlerContext extends RequestHandlerContext {
  licensing: LicensingApiRequestHandlerContext;
}

/**
 * @internal
 */
export type LicensingRouter = IRouter<LicensingRequestHandlerContext>;

/** @public */
export interface LicensingPluginSetup {
  /**
   * Steam of licensing information {@link ILicense}.
   * @deprecated in favour of the counterpart provided from start contract
   * @removeBy 8.8.0
   */
  license$: Observable<ILicense>;

  /**
   * Triggers licensing information re-fetch.
   * @deprecated in favour of the counterpart provided from start contract
   * @removeBy 8.8.0
   */
  refresh(): Promise<ILicense>;

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
    clusterClient: IClusterClient,
    pollingFrequency: number
  ) => { license$: Observable<ILicense>; refresh(): Promise<ILicense> };
  /**
   * APIs to manage licensed feature usage.
   */
  featureUsage: FeatureUsageServiceStart;
}
