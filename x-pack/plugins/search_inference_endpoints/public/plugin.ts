/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID, PLUGIN_NAME } from '../common/constants';
import { docLinks } from '../common/doc_links';
import { InferenceEndpoints, getInferenceEndpointsProvider } from './embeddable';
import {
  AppPluginSetupDependencies,
  AppPluginStartDependencies,
  SearchInferenceEndpointsConfigType,
  SearchInferenceEndpointsPluginSetup,
  SearchInferenceEndpointsPluginStart,
} from './types';
import { INFERENCE_ENDPOINTS_UI_FLAG } from '.';
import { registerLocators } from './locators';
import { INFERENCE_ENDPOINTS_PATH } from './components/routes';

export class SearchInferenceEndpointsPlugin
  implements Plugin<SearchInferenceEndpointsPluginSetup, SearchInferenceEndpointsPluginStart>
{
  private config: SearchInferenceEndpointsConfigType;

  constructor(initializerContext: PluginInitializerContext) {
    this.config = initializerContext.config.get<SearchInferenceEndpointsConfigType>();
  }

  public setup(
    core: CoreSetup<AppPluginStartDependencies, SearchInferenceEndpointsPluginStart>,
    plugins: AppPluginSetupDependencies
  ): SearchInferenceEndpointsPluginSetup {
    if (
      !this.config.ui?.enabled &&
      !core.uiSettings.get<boolean>(INFERENCE_ENDPOINTS_UI_FLAG, false)
    )
      return {};
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/elasticsearch/relevance',
      deepLinks: [
        {
          id: 'inferenceEndpoints',
          path: `/${INFERENCE_ENDPOINTS_PATH}`,
          title: i18n.translate('xpack.searchInferenceEndpoints.InferenceEndpointsLinkLabel', {
            defaultMessage: 'Inference Endpoints',
          }),
        },
      ],
      title: PLUGIN_NAME,
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: AppPluginStartDependencies = {
          ...depsStart,
          history,
        };

        return renderApp(coreStart, startDeps, element);
      },
    });

    registerLocators(plugins.share);

    return {};
  }

  public start(
    core: CoreStart,
    deps: AppPluginStartDependencies
  ): SearchInferenceEndpointsPluginStart {
    docLinks.setDocLinks(core.docLinks.links);

    return {
      InferenceEdnpointsProvider: getInferenceEndpointsProvider(core, deps),
      InferenceEndpoints,
    };
  }

  public stop() {}
}
