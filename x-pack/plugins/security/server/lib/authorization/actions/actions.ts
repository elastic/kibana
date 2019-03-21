/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApiActions } from './api';
import { AppActions } from './app';
import { SavedObjectActions } from './saved_object';
import { SpaceActions } from './space';
import { UIActions } from './ui';

export class Actions {
  public readonly allHack = 'allHack:';

  public readonly api = new ApiActions();

  public readonly app = new AppActions();

  public readonly login = 'login:';

  public readonly savedObject = new SavedObjectActions();

  public readonly space = new SpaceActions();

  public readonly ui = new UIActions();

  public readonly version = `version:${this.versionNumber}`;

  constructor(private readonly versionNumber: string) {}
}

export function actionsFactory(config: any) {
  return new Actions(config.get('pkg.version'));
}
