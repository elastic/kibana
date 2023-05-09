/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { createServerlessSearchSideNavComponent as createComponent } from './layout/nav';
import { docLinks } from '../common/doc_links';
import {
  ServerlessSearchPluginSetup,
  ServerlessSearchPluginSetupDependencies,
  ServerlessSearchPluginStart,
  ServerlessSearchPluginStartDependencies,
} from './types';

export class ServerlessSearchPlugin
  implements Plugin<ServerlessSearchPluginSetup, ServerlessSearchPluginStart>
{
  public setup(
    core: CoreSetup,
    _setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    core.application.register({
      id: 'serverlessElasticsearch',
      title: 'Elasticsearch',
      appRoute: '/app/elasticsearch',
      async mount({ element }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);

        return await renderApp(element, coreStart);
      },
    });
    return {};
  }

  public start(
    core: CoreStart,
    _startDeps: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    core.chrome.project.setSideNavComponent(createComponent(core));
    return {};
  }

  public stop() {}
}
