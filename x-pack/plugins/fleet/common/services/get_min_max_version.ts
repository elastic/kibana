/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import semverGt from 'semver/functions/gt';
import semverLt from 'semver/functions/gt';
import semverCoerce from 'semver/functions/coerce';

// Find max version from an array of string versions
export function getMaxVersion(versions: string[]) {
  const uniqVersions = uniq(versions).map((v) => semverCoerce(v)?.version);

  if (uniqVersions.length === 1) {
    return uniqVersions[0];
  } else if (uniqVersions.length > 1) {
    const sorted = uniqVersions.sort((a, b) => (semverGt(a as string, b as string) ? 1 : -1));
    return sorted[sorted.length - 1];
  }
  return undefined;
}

// Find min version from an array of string versions
export function getMinVersion(versions: string[]) {
  const uniqVersions = uniq(versions).map((v) => semverCoerce(v)?.version);

  if (uniqVersions.length === 1) {
    return uniqVersions[0];
  } else if (uniqVersions.length > 1) {
    const sorted = uniqVersions.sort((a, b) => (semverLt(a as string, b as string) ? 1 : -1));
    return sorted[0];
  }
  return undefined;
}
