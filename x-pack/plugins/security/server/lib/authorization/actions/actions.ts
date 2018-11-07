/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiActions } from './api';
import { AppActions } from './app';
import { SavedObjectActions } from './saved_object';
import { SpaceActions } from './space';
import { UiActions } from './ui';

export class Actions {
  public api = new ApiActions();

  public app = new AppActions();

  public login = `login:`;

  public savedObject = new SavedObjectActions();

  public space = new SpaceActions();

  public ui = new UiActions();

  public version = `version:${this.versionNumber}`;
  constructor(private versionNumber: string) {}
}

export function actionsFactory(config: any) {
  return new Actions(config.get('pkg.version'));
}
