/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/public';

import { ManagementSetup } from '../../../../src/plugins/management/public';
import { SecurityPluginSetup } from '../../security/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { LicensingPluginSetup } from '../../licensing/public';

import { bootstrap } from './bootstrap';
import { BeatsManagementConfigType } from '../common';

interface SetupDeps {
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
  security?: SecurityPluginSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
}

class BeatsManagementPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  constructor(private readonly initContext: PluginInitializerContext<BeatsManagementConfigType>) {}

  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    const config = this.initContext.config.get();
    bootstrap(core, plugins, config, this.initContext.env.packageInfo.version);
  }

  public start() {}
  public stop() {}
}

export const plugin = (init: PluginInitializerContext) => new BeatsManagementPlugin(init);
