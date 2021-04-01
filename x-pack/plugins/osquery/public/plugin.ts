/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, Subject } from 'rxjs';
import {
  AppMountParameters,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  AppStatus,
  AppUpdater,
} from '../../../../src/core/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import {
  OsqueryPluginSetup,
  OsqueryPluginStart,
  // SetupPlugins,
  StartPlugins,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';
import {
  LazyOsqueryManagedEmptyCreatePolicyExtension,
  LazyOsqueryManagedEmptyEditPolicyExtension,
} from './fleet_integration';
// import { getActionType } from './osquery_action_type';

export function toggleOsqueryPlugin(updater$: Subject<AppUpdater>, http: CoreStart['http']) {
  http.fetch('/api/fleet/epm/packages', { query: { experimental: true } }).then(({ response }) => {
    const installed = response.find(
      // @ts-expect-error update types
      (integration) =>
        integration?.name === 'osquery_elastic_managed' && integration?.status === 'installed'
    );
    updater$.next(() => ({
      status: installed ? AppStatus.accessible : AppStatus.inaccessible,
    }));
  });
}

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));
  private kibanaVersion: string;
  private storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup
    // plugins: SetupPlugins
  ): OsqueryPluginSetup {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();

    if (!config.enabled) {
      return {};
    }

    const storage = this.storage;
    const kibanaVersion = this.kibanaVersion;
    // Register an application into the side navigation menu
    core.application.register({
      id: 'osquery',
      title: PLUGIN_NAME,
      order: 9030,
      updater$: this.appUpdater$,
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

    // plugins.triggersActionsUi.actionTypeRegistry.register(getActionType());

    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, plugins: StartPlugins): OsqueryPluginStart {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();

    if (!config.enabled) {
      return {};
    }

    if (plugins.fleet) {
      const { registerExtension } = plugins.fleet;

      toggleOsqueryPlugin(this.appUpdater$, core.http);

      registerExtension({
        package: 'osquery_elastic_managed',
        view: 'package-policy-create',
        component: LazyOsqueryManagedEmptyCreatePolicyExtension,
      });

      registerExtension({
        package: 'osquery_elastic_managed',
        view: 'package-policy-edit',
        component: LazyOsqueryManagedEmptyEditPolicyExtension,
      });

      // registerExtension({
      //   package: 'osquery_elastic_managed',
      //   view: 'package-detail-custom',
      //   component: LazyOsqueryManagedCustomExtension,
      // });
    } else {
      this.appUpdater$.next(() => ({
        status: AppStatus.inaccessible,
      }));
    }

    return {};
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public stop() {}
}
