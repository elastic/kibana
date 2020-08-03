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
import { PluginSetupContract as FeaturesPluginSetup } from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';
import { LicensingPluginStart } from '../../licensing/server';
import { BeatsManagementConfigType } from '../common';

interface SetupDeps {
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
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

    plugins.features.registerElasticsearchFeature({
      id: 'beats_management',
      management: {
        ingest: ['beats_management'],
      },
      privileges: [
        {
          ui: [],
          requiredClusterPrivileges: [],
          requiredRoles: ['beats_admin'],
        },
      ],
    });

    return {};
  }

  public async start(core: CoreStart, { licensing }: StartDeps) {
    return {};
  }
}
