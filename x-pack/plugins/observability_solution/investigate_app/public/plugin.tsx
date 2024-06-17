/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  AppMountParameters,
  APP_WRAPPER_CLASS,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/public';
import { INVESTIGATE_APP_ID } from '@kbn/deeplinks-observability/constants';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { once } from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { css } from '@emotion/css';
import { createCallInvestigateAppAPI } from './api';
import type { InvestigateAppServices } from './services/types';
import type {
  ConfigSchema,
  InvestigateAppPublicSetup,
  InvestigateAppPublicStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies,
} from './types';

const getCreateAssistantService = once(() =>
  import('./services/assistant').then((m) => m.createAssistantService)
);

const getCreateEsqlService = once(() => import('./services/esql').then((m) => m.createEsqlService));

export class InvestigateAppPlugin
  implements
    Plugin<
      InvestigateAppPublicSetup,
      InvestigateAppPublicStart,
      InvestigateAppSetupDependencies,
      InvestigateAppStartDependencies
    >
{
  logger: Logger;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup<InvestigateAppStartDependencies, InvestigateAppPublicStart>,
    pluginsSetup: InvestigateAppSetupDependencies
  ): InvestigateAppPublicSetup {
    const apiClient = createCallInvestigateAppAPI(coreSetup);

    coreSetup.application.register({
      id: INVESTIGATE_APP_ID,
      title: i18n.translate('xpack.investigateApp.appTitle', {
        defaultMessage: 'Observability AI Assistant',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/investigate',
      category: DEFAULT_APP_CATEGORIES.observability,
      visibleIn: [],
      deepLinks: [
        {
          id: 'investigate',
          title: i18n.translate('xpack.investigateApp.investigateDeepLinkTitle', {
            defaultMessage: 'Investigate',
          }),
          path: '/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [
          { Application },
          [coreStart, pluginsStart],
          createEsqlService,
          createAssistantService,
        ] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
          getCreateEsqlService(),
          getCreateAssistantService(),
        ]);

        const services: InvestigateAppServices = {
          esql: createEsqlService({
            data: pluginsStart.data,
            dataViews: pluginsStart.dataViews,
            lens: pluginsStart.lens,
          }),
          assistant: createAssistantService({
            contentManagement: pluginsStart.contentManagement,
            embeddable: pluginsStart.embeddable,
            observabilityAIAssistant: pluginsStart.observabilityAIAssistant,
            datasetQuality: pluginsStart.datasetQuality,
            dataViews: pluginsStart.dataViews,
            security: pluginsStart.security,
            apiClient,
            logger: this.logger,
          }),
        };

        ReactDOM.render(
          <Application
            coreStart={coreStart}
            history={appMountParameters.history}
            pluginsStart={pluginsStart}
            theme$={appMountParameters.theme$}
            services={services}
          />,
          appMountParameters.element
        );

        const appWrapperClassName = css`
          overflow-y: auto;
          overflow-x: auto;
        `;

        const appWrapperElement = document.getElementsByClassName(APP_WRAPPER_CLASS)[1];

        appWrapperElement.classList.add(appWrapperClassName);

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
          appWrapperElement.classList.remove(appWrapperClassName);
        };
      },
    });

    const pluginsStartPromise = coreSetup
      .getStartServices()
      .then(([, pluginsStart]) => pluginsStart);

    pluginsSetup.investigate.register((registerWidget) =>
      Promise.all([
        pluginsStartPromise,
        import('./widgets/register_widgets').then((m) => m.registerWidgets),
        getCreateEsqlService(),
        getCreateAssistantService(),
      ]).then(([pluginsStart, registerWidgets, createEsqlService, createAssistantService]) => {
        registerWidgets({
          dependencies: {
            setup: pluginsSetup,
            start: pluginsStart,
          },
          services: {
            esql: createEsqlService({
              data: pluginsStart.data,
              dataViews: pluginsStart.dataViews,
              lens: pluginsStart.lens,
            }),
            assistant: createAssistantService({
              contentManagement: pluginsStart.contentManagement,
              embeddable: pluginsStart.embeddable,
              observabilityAIAssistant: pluginsStart.observabilityAIAssistant,
              datasetQuality: pluginsStart.datasetQuality,
              dataViews: pluginsStart.dataViews,
              security: pluginsStart.security,
              apiClient,
              logger: this.logger,
            }),
          },
          registerWidget,
        });
      })
    );

    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: InvestigateAppStartDependencies
  ): InvestigateAppPublicStart {
    return {};
  }
}
