/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../types';

export function isPackagePrerelease(pkg: PackageInfo): boolean {
  // derive from semver
  return (
    pkg.version.startsWith('0') ||
    pkg.version.includes('preview') ||
    pkg.version.includes('beta') ||
    pkg.version.includes('rc')
  );
}
