/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export interface CspNavigationItem {
  readonly name: string;
  readonly path: string;
  readonly disabled?: boolean;
}

export interface CspPageNavigationItem extends CspNavigationItem {
  id: CloudSecurityPosturePageId;
}

export type CspPage = 'dashboard' | 'findings' | 'benchmarks';
export type CspBenchmarksPage = 'rules';

/**
 * All the IDs for the cloud security posture pages.
 * This needs to match the cloud security posture page entries in `SecurityPageName` in `x-pack/plugins/security_solution/common/constants.ts`.
 */
export type CloudSecurityPosturePageId =
  | 'cloud_security_posture-dashboard'
  | 'cloud_security_posture-findings'
  | 'cloud_security_posture-benchmarks'
  | 'cloud_security_posture-benchmarks-rules';
