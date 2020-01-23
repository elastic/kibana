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

/** Actions are used to create the "actions" that are associated with Elasticsearch's
 * application privileges, and are used to perform the authorization checks implemented
 * by the various `checkPrivilegesWithRequest` derivatives
 */
export class Actions {
  /**
   * The allHack action is used to differentiate the `all` privilege from the `read` privilege
   * for those applications which register the same set of actions for both privileges. This is a
   * temporary hack until we remove this assumption in the role management UI
   */
  public readonly allHack = 'allHack:';

  public readonly api = new ApiActions(this.versionNumber);

  public readonly app = new AppActions(this.versionNumber);

  public readonly login = 'login:';

  public readonly savedObject = new SavedObjectActions(this.versionNumber);

  public readonly space = new SpaceActions(this.versionNumber);

  public readonly ui = new UIActions(this.versionNumber);

  public readonly version = `version:${this.versionNumber}`;

  constructor(private readonly versionNumber: string) {
    if (versionNumber === '') {
      throw new Error(`version can't be an empty string`);
    }
  }
}
