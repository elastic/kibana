/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertingActions } from './alerting';
import { ApiActions } from './api';
import { AppActions } from './app';
import { CasesActions } from './cases';
import { SavedObjectActions } from './saved_object';
import { SpaceActions } from './space';
import { UIActions } from './ui';

/** Actions are used to create the "actions" that are associated with Elasticsearch's
 * application privileges, and are used to perform the authorization checks implemented
 * by the various `checkPrivilegesWithRequest` derivatives.
 */
export class Actions {
  public readonly api: ApiActions;
  public readonly app: AppActions;
  public readonly cases: CasesActions;
  public readonly login: string;
  public readonly savedObject: SavedObjectActions;
  public readonly alerting: AlertingActions;
  public readonly space: SpaceActions;
  public readonly ui: UIActions;
  public readonly version: string;

  constructor(private readonly versionNumber: string) {
    if (versionNumber === '') {
      throw new Error(`version can't be an empty string`);
    }

    this.api = new ApiActions(this.versionNumber);
    this.app = new AppActions(this.versionNumber);
    this.cases = new CasesActions(this.versionNumber);
    this.login = 'login:';
    this.savedObject = new SavedObjectActions(this.versionNumber);
    this.alerting = new AlertingActions(this.versionNumber);
    this.space = new SpaceActions(this.versionNumber);
    this.ui = new UIActions(this.versionNumber);
    this.version = `version:${this.versionNumber}`;
  }
}
