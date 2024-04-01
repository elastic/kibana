/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverLte from 'semver/functions/lte';

function parseSemver(semver: string) {
  return semver.includes('-') ? semver.substring(0, semver.indexOf('-')) : semver;
}

// switch to "v2" logic
const MIN_ENDPOINT_PACKAGE_V2_VERSION = '8.14.0';
export function isEndpointPackageV2(version: string) {
  const parsedVersion = parseSemver(version);
  return semverLte(MIN_ENDPOINT_PACKAGE_V2_VERSION, parsedVersion);
}
