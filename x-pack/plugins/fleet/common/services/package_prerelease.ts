/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationCardReleaseLabel, RegistryRelease } from '../types';

export function isPackagePrerelease(version: string): boolean {
  // derive from semver
  return version.startsWith('0') || version.includes('-');
}

export function getPackageReleaseLabel(version: string): IntegrationCardReleaseLabel {
  if (version.startsWith('0') || version.includes('-preview')) {
    return 'preview';
  } else if (version.includes('-rc')) {
    return 'rc';
  } else if (version.includes('-')) {
    return 'beta';
  }
  return 'ga';
}

export function mapPackageReleaseToIntegrationCardRelease(
  release: RegistryRelease
): IntegrationCardReleaseLabel {
  return release === 'experimental' ? 'preview' : release;
}
