/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
  SavedObjectsClientContract,
  SavedObjectsClient,
} from 'kibana/server';
import { APP } from '../common/constants';

import { ConsoleSetup } from '../../../../src/plugins/console/server';
import { PluginSetupContract as FeatureSetup } from '../../features/server';
import { SecurityPluginSetup } from '../../security/server';

import { installExtensions } from './spec/install_extensions';

import { registerTextObjectsRoutes } from './routes/api/text_object';

interface SetupDependencies {
  console: ConsoleSetup;
  features: FeatureSetup;
  security: SecurityPluginSetup;
}

export class ConsoleExtensionsServerPlugin implements Plugin<void, void, SetupDependencies> {
  private internalSavedObjectsClient: SavedObjectsClientContract | null = null;

  private readonly log: Logger;

  constructor(private readonly ctx: PluginInitializerContext) {
    this.log = this.ctx.logger.get();
  }

  setup(
    { http, getStartServices }: CoreSetup,
    { console, features, security: { authc } }: SetupDependencies
  ) {
    // We register this feature explicitly without direct access to Saved Objects
    // per docs/developer/plugin/development-plugin-feature-registration.asciidoc
    features.registerFeature({
      id: APP.id,
      name: APP.name,
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
    });

    getStartServices().then(([{ savedObjects }]) => {
      this.internalSavedObjectsClient = new SavedObjectsClient(
        savedObjects.createInternalRepository()
      );
    });

    const router = http.createRouter();

    registerTextObjectsRoutes({
      router,
      authc,
      getInternalSavedObjectsClient: () => {
        if (!this.internalSavedObjectsClient) {
          throw new Error('Saved Objects Internal Client not available.');
        }
        return this.internalSavedObjectsClient;
      },
    });

    installExtensions(console, this.log);
  }

  start(core: CoreStart) {}
}
