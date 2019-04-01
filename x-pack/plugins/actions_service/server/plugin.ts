/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

interface CoreSetup {
  log: (tags: string | string[], data?: string | object | (() => any), timestamp?: number) => void;
}

export class Plugin {
  public setup(core: CoreSetup, dependencies: object) {
    core.log(['action_service', 'info'], 'Setting up the Action Service Plugin');
  }
}
