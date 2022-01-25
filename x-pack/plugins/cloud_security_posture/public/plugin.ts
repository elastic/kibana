/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../../src/core/public';
import type {
  CspClientPluginSetup,
  CspClientPluginStart,
  CspClientPluginSetupDeps,
  CspClientPluginStartDeps,
} from './types';
import { PLUGIN_NAME, PLUGIN_ID } from '../common';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/public';
import { ENABLE_CSP } from '../common/constants';
import { CSP_KUBEBEAT_INDEX_PATTERN } from '../common/constants';

export class CspPlugin
  implements
    Plugin<
      CspClientPluginSetup,
      CspClientPluginStart,
      CspClientPluginSetupDeps,
      CspClientPluginStartDeps
    >
{
  public setup(
    core: CoreSetup<CspClientPluginStartDeps, CspClientPluginStart>,
    plugins: CspClientPluginSetupDeps
  ): CspClientPluginSetup {
    // Register an application into the side navigation menu
    const cspEnabled: boolean = core.uiSettings.get(ENABLE_CSP);
    if (!cspEnabled) return {};

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.security,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application/index');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart, params);
      },
    });

    registerKubebeatDataView(core);

    // Return methods that should be available to other plugins
    return {};
  }
  public start(core: CoreStart, plugins: CspClientPluginStartDeps): CspClientPluginStart {
    return {};
  }

  public stop() {}
}

async function registerKubebeatDataView(
  core: CoreSetup<CspClientPluginStartDeps, CspClientPluginStart>
) {
  try {
    const [, depsStart] = await core.getStartServices();
    const dataView = await depsStart.data.dataViews.find(CSP_KUBEBEAT_INDEX_PATTERN);
    if (dataView) return;

    await depsStart.data.dataViews.createAndSave({
      title: CSP_KUBEBEAT_INDEX_PATTERN,
      allowNoIndex: true,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}
