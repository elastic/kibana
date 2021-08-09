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
  AppNavLinkStatus,
  AppUpdater,
} from '../../../../src/core/public';
import { Storage } from '../../../../src/plugins/kibana_utils/public';
import {
  OsqueryPluginSetup,
  OsqueryPluginStart,
  StartPlugins,
  AppPluginStartDependencies,
} from './types';
import { OSQUERY_INTEGRATION_NAME, PLUGIN_NAME } from '../common';
import { Installation } from '../../fleet/common';
import {
  LazyOsqueryManagedPolicyCreateImportExtension,
  LazyOsqueryManagedPolicyEditExtension,
  LazyOsqueryManagedCustomButtonExtension,
} from './fleet_integration';
import { getLazyOsqueryAction } from './shared_components';

export function toggleOsqueryPlugin(
  updater$: Subject<AppUpdater>,
  http: CoreStart['http'],
  registerExtension?: StartPlugins['fleet']['registerExtension']
) {
  if (http.anonymousPaths.isAnonymous(window.location.pathname)) {
    updater$.next(() => ({
      status: AppStatus.inaccessible,
      navLinkStatus: AppNavLinkStatus.hidden,
    }));
    return;
  }

  http
    .fetch<Installation | undefined>(`/internal/osquery/status`)
    .then((response) => {
      const installed = response?.install_status === 'installed';

      if (installed && registerExtension) {
        registerExtension({
          package: OSQUERY_INTEGRATION_NAME,
          view: 'package-detail-custom',
          Component: LazyOsqueryManagedCustomButtonExtension,
        });
      }

      updater$.next(() => ({
        navLinkStatus: installed ? AppNavLinkStatus.visible : AppNavLinkStatus.hidden,
      }));
    })
    .catch(() => {
      updater$.next(() => ({
        status: AppStatus.inaccessible,
        navLinkStatus: AppNavLinkStatus.hidden,
      }));
    });
}

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({
    navLinkStatus: AppNavLinkStatus.hidden,
  }));
  private kibanaVersion: string;
  private storage = new Storage(localStorage);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = this.initializerContext.env.packageInfo.version;
  }

  public setup(core: CoreSetup): OsqueryPluginSetup {
    const config = this.initializerContext.config.get<{
      enabled: boolean;
      actionEnabled: boolean;
      scheduledQueries: boolean;
      savedQueries: boolean;
      packs: boolean;
    }>();

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
      navLinkStatus: AppNavLinkStatus.hidden,
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
    const config = this.initializerContext.config.get<{
      enabled: boolean;
      actionEnabled: boolean;
      scheduledQueries: boolean;
      savedQueries: boolean;
      packs: boolean;
    }>();

    if (!config.enabled) {
      return {};
    }

    if (plugins.fleet) {
      const { registerExtension } = plugins.fleet;

      toggleOsqueryPlugin(this.appUpdater$, core.http, registerExtension);

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
    } else {
      this.appUpdater$.next(() => ({
        status: AppStatus.inaccessible,
        navLinkStatus: AppNavLinkStatus.hidden,
      }));
    }

    return {
      OsqueryAction: getLazyOsqueryAction({
        ...core,
        ...plugins,
        storage: this.storage,
        kibanaVersion: this.kibanaVersion,
      }),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public stop() {}
}
