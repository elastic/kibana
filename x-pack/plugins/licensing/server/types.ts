/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
}

declare module 'src/core/server' {
  interface RequestHandlerContext {
    licensing: {
      license: ILicense;
    };
  }
}
