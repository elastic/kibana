/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { FeatureKibanaPrivileges } from '../../../../../features/public';
import { Privilege } from './kibana_privileges/privilege_instance';

export class FeaturePrivilege extends Privilege {
  constructor(
    id: string,
    protected readonly config: FeatureKibanaPrivileges,
    public readonly actions: string[] = []
  ) {
    super('feature', id, actions);
  }

  public get name() {
    return _.capitalize(this.id);
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
}
