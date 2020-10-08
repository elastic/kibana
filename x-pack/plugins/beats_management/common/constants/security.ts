/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const REQUIRED_ROLES = ['beats_admin'];
export const REQUIRED_LICENSES = ['standard', 'gold', 'trial', 'platinum', 'enterprise'];
export const LICENSES = ['oss', 'basic', 'standard', 'gold', 'trial', 'platinum', 'enterprise'];
export type LicenseType =
  | 'oss'
  | 'basic'
  | 'trial'
  | 'standard'
  | 'gold'
  | 'platinum'
  | 'enterprise';
