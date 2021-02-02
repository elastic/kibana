/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SemVer } from 'semver';

export const MOCK_VERSION_STRING = '8.0.0';

export const getMockVersionInfo = (versionString = MOCK_VERSION_STRING) => {
  const currentVersion = new SemVer(versionString);
  const currentMajor = currentVersion.major;

  return {
    currentVersion,
    currentMajor,
    prevMajor: currentMajor - 1,
    nextMajor: currentMajor + 1,
  };
};
