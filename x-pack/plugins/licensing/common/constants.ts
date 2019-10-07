/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const API_ROUTE = '/api/xpack/v1/info';
export const LICENSING_SESSION = 'xpack.licensing';
export const LICENSING_SESSION_SIGNATURE = 'xpack.licensing.signature';
export const SIGNATURE_HEADER = 'kbn-xpack-sig';
export const DEFAULT_POLLING_FREQUENCY = 30001; // 30 seconds
export enum LICENSE_CHECK_STATE {
  Unavailable = 'UNAVAILABLE',
  Invalid = 'INVALID',
  Expired = 'EXPIRED',
  Valid = 'VALID',
}
export enum LICENSE_TYPE {
  basic = 10,
  standard = 20,
  gold = 30,
  platinum = 40,
  trial = 50,
}
