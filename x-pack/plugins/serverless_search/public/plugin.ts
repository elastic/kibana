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
  implements
    Plugin<
      ServerlessSearchPluginSetup,
      ServerlessSearchPluginStart,
      ServerlessSearchPluginSetupDependencies,
      ServerlessSearchPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<ServerlessSearchPluginStartDependencies, ServerlessSearchPluginStart>,
    _setupDeps: ServerlessSearchPluginSetupDependencies
  ): ServerlessSearchPluginSetup {
    core.application.register({
      id: 'serverlessElasticsearch',
      title: 'Elasticsearch',
      appRoute: '/app/elasticsearch',
      async mount({ element }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, { cloud, security }] = await core.getStartServices();
        docLinks.setDocLinks(coreStart.docLinks.links);

        const userProfile = await security.userProfiles.getCurrent();

        return await renderApp(element, coreStart, { cloud, userProfile });
      },
    });
    return {};
  }

  public start(
    core: CoreStart,
    { serverless }: ServerlessSearchPluginStartDependencies
  ): ServerlessSearchPluginStart {
    serverless.setSideNavComponent(createComponent(core));
    return {};
  }

  public stop() {}
}
