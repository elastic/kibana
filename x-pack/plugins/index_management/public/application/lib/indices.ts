/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import SemVer from 'semver/classes/semver';

import { MAJOR_VERSION } from '../../../common';
import { Index } from '../../../common';

const kibanaVersion = new SemVer(MAJOR_VERSION);

export const isHiddenIndex = (index: Index): boolean => {
  if (kibanaVersion.major < 8) {
    // In 7.x we consider hidden index all indices whose name start with a dot
    return (index.name ?? '').startsWith('.') || index.hidden === true;
  }
  return index.hidden === true;
};

export const isSystemIndex = (index: Index): boolean => {
  if (kibanaVersion.major < 8) {
    return (index.name ?? '').startsWith('.');
  }
  // From 8.0 we won't surface system indices in Index management
  return false;
};
