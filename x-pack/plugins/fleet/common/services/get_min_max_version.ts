/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import semverGt from 'semver/functions/gt';
import semverCoerce from 'semver/functions/coerce';

// Sort array in ascending order
export function sortVersions(versions: string[]) {
  // remove duplicates and filter out invalid versions
  const uniqVersions = uniq(versions).filter((v) => semverCoerce(v)?.version !== undefined);

  if (uniqVersions.length > 1) {
    return uniqVersions.sort((a, b) => (semverGt(a, b) ? 1 : -1));
  }
  return uniqVersions;
}

// Find max version from an array of string versions
export function getMaxVersion(versions: string[]) {
  const sorted = sortVersions(versions);
  if (sorted.length >= 1) {
    return sorted[sorted.length - 1];
  }
  return '';
}

// Find min version from an array of string versions
export function getMinVersion(versions: string[]) {
  const sorted = sortVersions(versions);
  if (sorted.length >= 1) {
    return sorted[0];
  }
  return '';
}
