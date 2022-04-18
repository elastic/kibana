/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
} from '@kbn/core/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  OsqueryPluginSetup,
  OsqueryPluginStart,
  StartPlugins,
  AppPluginStartDependencies,
} from './types';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_NAME } from '../common';
import {
  LazyOsqueryManagedPolicyCreateImportExtension,
  LazyOsqueryManagedPolicyEditExtension,
  LazyOsqueryManagedCustomButtonExtension,
} from './fleet_integration';
import { getLazyOsqueryAction, useIsOsqueryAvailableSimple } from './shared_components';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private kibanaVersion: string;
  private storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup): OsqueryPluginSetup {
    const storage = this.storage;
    const kibanaVersion = this.kibanaVersion;
    // Register an application into the side navigation menu
    core.application.register({
      id: 'osquery',
      title: PLUGIN_NAME,
      order: 9030,
      category: DEFAULT_APP_CATEGORIES.management,
      async mount(params: AppMountParameters) {
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Load application bundle
        const { renderApp } = await import('./application');
        // Render the application
        return renderApp(
          coreStart,
          depsStart as AppPluginStartDependencies,
          params,
          storage,
          kibanaVersion
        );
      },
    });

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins): OsqueryPluginStart {
    if (plugins.fleet) {
      const { registerExtension } = plugins.fleet;

      registerExtension({
        package: OSQUERY_INTEGRATION_NAME,
        view: 'package-policy-create',
        Component: LazyOsqueryManagedPolicyCreateImportExtension,
      });

      registerExtension({
        package: OSQUERY_INTEGRATION_NAME,
        view: 'package-policy-edit',
        Component: LazyOsqueryManagedPolicyEditExtension,
      });

      registerExtension({
        package: OSQUERY_INTEGRATION_NAME,
        view: 'package-detail-custom',
        Component: LazyOsqueryManagedCustomButtonExtension,
      });
    }

    return {
      OsqueryAction: getLazyOsqueryAction({
        ...core,
        ...plugins,
        storage: this.storage,
        kibanaVersion: this.kibanaVersion,
      }),
      isOsqueryAvailable: useIsOsqueryAvailableSimple,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public stop() {}
}
