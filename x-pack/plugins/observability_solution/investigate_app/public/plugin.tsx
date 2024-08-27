/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import {
  APP_WRAPPER_CLASS,
  AppMountParameters,
  AppStatus,
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
import type { InvestigateAppServices } from './services/types';
import type {
  ConfigSchema,
  InvestigateAppPublicSetup,
  InvestigateAppPublicStart,
  InvestigateAppSetupDependencies,
  InvestigateAppStartDependencies,
} from './types';

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
  config: ConfigSchema;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<InvestigateAppStartDependencies, InvestigateAppPublicStart>,
    pluginsSetup: InvestigateAppSetupDependencies
  ): InvestigateAppPublicSetup {
    coreSetup.application.register({
      id: INVESTIGATE_APP_ID,
      title: i18n.translate('xpack.investigateApp.appTitle', {
        defaultMessage: 'Investigations',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/investigations',
      category: DEFAULT_APP_CATEGORIES.observability,
      status: this.config.enabled ? AppStatus.accessible : AppStatus.inaccessible,
      visibleIn: [],
      deepLinks: [
        {
          id: 'investigations',
          title: i18n.translate('xpack.investigateApp.investigationsDeepLinkTitle', {
            defaultMessage: 'All investigations',
          }),
          path: '/',
        },
        {
          id: 'investigationDetails',
          title: i18n.translate('xpack.investigateApp.newInvestigateDeepLinkTitle', {
            defaultMessage: 'New investigation',
          }),
          path: '/new',
        },
      ],
      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart], createEsqlService] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
          getCreateEsqlService(),
        ]);

        const services: InvestigateAppServices = {
          esql: createEsqlService({
            data: pluginsStart.data,
            dataViews: pluginsStart.dataViews,
            lens: pluginsStart.lens,
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
          overflow: auto;
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
      ]).then(([pluginsStart, registerWidgets, createEsqlService]) => {
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
