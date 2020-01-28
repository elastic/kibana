/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { FeatureKibanaPrivileges } from '../../../features/common';
import { Privilege, PrivilegeScope } from './poc_kibana_privileges/privilege_instance';

export class FeaturePrivilege extends Privilege {
  constructor(
    scope: PrivilegeScope,
    id: string,
    protected readonly config: FeatureKibanaPrivileges,
    public readonly actions: string[] = []
  ) {
    super(scope, 'feature', id, actions);
  }

  public get name() {
    return this.config.name || _.capitalize(this.id);
  }

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
    return new FeaturePrivilege(
      this.scope,
      this.id,
      this.mergePrivilegeConfigs(otherPrivilege),
      Array.from(new Set([...this.actions, ...otherPrivilege.actions]).values())
    );
  }

  protected mergePrivilegeConfigs(other: FeaturePrivilege) {
    return {
      ...this.config,
      api: this.api ? [...(this.api || []), ...(other.config.api || [])] : undefined,
      app: this.app ? [...(this.app || []), ...(other.config.app || [])] : undefined,
      ui: this.ui ? [...this.ui, ...other.config.ui!] : [],
      savedObject: {
        all: [...this.savedObject.all, ...other.config.savedObject.all],
        read: [...this.savedObject.read, ...other.config.savedObject.read],
      },
    };
  }
}
