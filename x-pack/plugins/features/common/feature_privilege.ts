/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from './feature_kibana_privileges';

export class FeaturePrivilege {
  constructor(public readonly id: string, private readonly config: FeatureKibanaPrivileges) {}

  public get app() {
    return this.config.app;
  }

  public get api() {
    return this.config.api;
  }

  public get catalogue() {
    return this.config.catalogue;
  }

  public get management() {
    return this.config.management;
  }

  public get ui() {
    return this.config.ui;
  }

  public get savedObject() {
    return this.config.savedObject;
  }

  public get excludeFromBasePrivileges() {
    return Boolean(this.config.excludeFromBasePrivileges);
  }

  public merge(otherPrivilege: FeaturePrivilege) {
    const mergedPrivilege: FeatureKibanaPrivileges = {
      ...this.config,
      api: this.api ? [...this.api, ...otherPrivilege.api!] : undefined,
      app: this.app ? [...this.app, ...otherPrivilege.app!] : undefined,
      ui: this.ui ? [...this.ui, ...otherPrivilege.ui!] : [],
      savedObject: {
        all: [...this.savedObject.all, ...otherPrivilege.savedObject.all],
        read: [...this.savedObject.read, ...otherPrivilege.savedObject.read],
      },
    };

    return new FeaturePrivilege('TODO', mergedPrivilege);
  }
}
