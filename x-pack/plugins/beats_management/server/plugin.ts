/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { SecurityPluginSetup } from '../../security/server';
import { LicensingPluginStart } from '../../licensing/server';
import { BeatsManagementConfigType } from '../common';

interface SetupDeps {
  security?: SecurityPluginSetup;
}

interface StartDeps {
  licensing: LicensingPluginStart;
}

export class BeatsManagementPlugin implements Plugin<{}, {}, SetupDeps, StartDeps> {
  constructor(
    private readonly initializerContext: PluginInitializerContext<BeatsManagementConfigType>
  ) {}

  public async setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    this.initializerContext.config.create();

    return {};
  }

  public async start(core: CoreStart, { licensing }: StartDeps) {
    return {};
  }
}
