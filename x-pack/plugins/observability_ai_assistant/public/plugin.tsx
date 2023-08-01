/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCodeBlock } from '@elastic/eui';
import {
  AppNavLinkStatus,
  type CoreStart,
  DEFAULT_APP_CATEGORIES,
  type AppMountParameters,
  type CoreSetup,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import type { Serializable } from '@kbn/utility-types';
import React from 'react';
import ReactDOM from 'react-dom';
import type {
  ContextRegistry,
  FunctionRegistry,
  RegisterContextDefinition,
  RegisterFunctionDefinition,
} from '../common/types';
import { createService } from './service/create_service';
import type {
  ConfigSchema,
  ObservabilityAIAssistantPluginSetup,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStart,
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantService,
} from './types';

export class ObservabilityAIAssistantPlugin
  implements
    Plugin<
      ObservabilityAIAssistantPluginSetup,
      ObservabilityAIAssistantPluginStart,
      ObservabilityAIAssistantPluginSetupDependencies,
      ObservabilityAIAssistantPluginStartDependencies
    >
{
  logger: Logger;
  service?: ObservabilityAIAssistantService;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantPluginSetup {
    coreSetup.application.register({
      id: 'observabilityAIAssistant',
      title: i18n.translate('xpack.observabilityAiAssistant.appTitle', {
        defaultMessage: 'Observability AI Assistant',
      }),
      euiIconType: 'logoObservability',
      appRoute: '/app/observabilityAIAssistant',
      category: DEFAULT_APP_CATEGORIES.observability,
      navLinkStatus: AppNavLinkStatus.hidden,
      deepLinks: [
        {
          id: 'conversations',
          title: i18n.translate('xpack.observabilityAiAssistant.conversationsDeepLinkTitle', {
            defaultMessage: 'Conversations',
          }),
          path: '/conversations',
        },
      ],

      mount: async (appMountParameters: AppMountParameters<unknown>) => {
        // Load application bundle and Get start services
        const [{ Application }, [coreStart, pluginsStart]] = await Promise.all([
          import('./application'),
          coreSetup.getStartServices(),
        ]);

        ReactDOM.render(
          <Application
            {...appMountParameters}
            service={this.service!}
            coreStart={coreStart}
            pluginsStart={pluginsStart as ObservabilityAIAssistantPluginStartDependencies}
          />,
          appMountParameters.element
        );

        return () => {
          ReactDOM.unmountComponentAtNode(appMountParameters.element);
        };
      },
    });
    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantPluginStartDependencies
  ): ObservabilityAIAssistantPluginStart {
    const contextRegistry: ContextRegistry = new Map();
    const functionRegistry: FunctionRegistry = new Map();

    const service = (this.service = createService({
      coreStart,
      securityStart: pluginsStart.security,
      contextRegistry,
      functionRegistry,
    }));

    const registerContext: RegisterContextDefinition = (context) => {
      contextRegistry.set(context.name, context);
    };

    const registerFunction: RegisterFunctionDefinition = (def, respond, render) => {
      functionRegistry.set(def.name, { options: def, respond, render });
    };

    registerContext({
      name: 'core',
      description:
        'Core functions, like calling Elasticsearch APIs, storing embeddables for instructions or creating base visualisations.',
    });

    registerFunction(
      {
        name: 'elasticsearch',
        contexts: ['core'],
        description: 'Call Elasticsearch APIs on behalf of the user',
        parameters: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              description: 'The HTTP method of the Elasticsearch endpoint',
              enum: ['GET', 'PUT', 'POST', 'DELETE', 'PATCH'] as const,
            },
            path: {
              type: 'string',
              description: 'The path of the Elasticsearch endpoint, including query parameters',
            },
          },
          required: ['method' as const, 'path' as const],
        },
      },
      ({ arguments: { method, path, body } }, signal) => {
        return service
          .callApi(`POST /internal/observability_ai_assistant/functions/elasticsearch`, {
            signal,
            params: {
              body: {
                method,
                path,
                body,
              },
            },
          })
          .then((response) => ({ content: response as Serializable }));
      },
      ({ response: { content } }) => {
        return <EuiCodeBlock lang="json">{JSON.stringify(content, null, 2)}</EuiCodeBlock>;
      }
    );

    return {
      ...service,
      registerContext,
      registerFunction,
    };
  }
}
