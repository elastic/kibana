/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import SemVer from 'semver/classes/semver';

export class Version {
  private version!: SemVer;

  public setup(version: string) {
    this.version = new SemVer(version);
  }

  public getCurrentVersion() {
    return this.version;
  }

  public getMajorVersion() {
    return this.version?.major;
  }

  public getNextMajorVersion() {
    return this.version?.major + 1;
  }

  public getPrevMajorVersion() {
    return this.version?.major - 1;
  }
}

export const versionService = new Version();
