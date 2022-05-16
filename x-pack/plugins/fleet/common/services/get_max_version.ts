/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import semverGt from 'semver/functions/gt';
import semverCoerce from 'semver/functions/coerce';

// Find max version from an array of string versions
export function getMaxVersion(versions: string[]) {
  const uniqVersions: string[] = uniq(versions);

  if (uniqVersions.length === 1) {
    const semverVersion = semverCoerce(uniqVersions[0])?.version;
    return semverVersion ? semverVersion : '';
  } else if (uniqVersions.length > 1) {
    const sorted = uniqVersions.sort((a, b) => (semverGt(a, b) ? 1 : -1));
    return sorted[sorted.length - 1];
  }
  return '';
}
