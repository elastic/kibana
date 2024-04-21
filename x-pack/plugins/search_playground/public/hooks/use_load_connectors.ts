/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ServerError } from '@kbn/cases-plugin/public/types';
import { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import {
  OPENAI_CONNECTOR_ID,
  OpenAiProviderType,
  BEDROCK_CONNECTOR_ID,
} from '@kbn/stack-connectors-plugin/public/common';
import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useKibana } from './use_kibana';
import { LLMs } from '../types';

const QUERY_KEY = ['search-playground, load-connectors'];

type OpenAIConnector = UserConfiguredActionConnector<
  { apiProvider: OpenAiProviderType },
  Record<string, unknown>
>;

const connectorTypeToLLM: Array<{
  actionId: string;
  actionProvider?: string;
  match: (connector: ActionConnector) => boolean;
  transform: (connector: ActionConnector) => PlaygroundConnector;
}> = [
  {
    actionId: OPENAI_CONNECTOR_ID,
    actionProvider: OpenAiProviderType.AzureAi,
    match: (connector) =>
      connector.actionTypeId === OPENAI_CONNECTOR_ID &&
      (connector as OpenAIConnector).config.apiProvider === OpenAiProviderType.AzureAi,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIAzureConnectorTitle', {
        defaultMessage: 'OpenAI Azure',
      }),
      type: LLMs.openai_azure,
    }),
  },
  {
    actionId: OPENAI_CONNECTOR_ID,
    match: (connector) =>
      connector.actionTypeId === OPENAI_CONNECTOR_ID &&
      (connector as OpenAIConnector).config.apiProvider === OpenAiProviderType.OpenAi,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIConnectorTitle', {
        defaultMessage: 'OpenAI',
      }),
      type: LLMs.openai,
    }),
  },
  {
    actionId: BEDROCK_CONNECTOR_ID,
    match: (connector) => connector.actionTypeId === BEDROCK_CONNECTOR_ID,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.bedrockConnectorTitle', {
        defaultMessage: 'Bedrock',
      }),
      type: LLMs.bedrock,
    }),
  },
];

type PlaygroundConnector = ActionConnector & { title: string; type: LLMs };

export const useLoadConnectors = (): UseQueryResult<PlaygroundConnector[], IHttpFetchError> => {
  const {
    services: { http, notifications },
  } = useKibana();

  return useQuery(
    QUERY_KEY,
    async () => {
      const queryResult = await loadConnectors({ http });

      return queryResult.reduce<PlaygroundConnector[]>((result, connector) => {
        const { transform } = connectorTypeToLLM.find(({ match }) => match(connector)) || {};

        if (!connector.isMissingSecrets && !!transform) {
          return [...result, transform(connector)];
        }

        return result;
      }, []);
    },
    {
      retry: false,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          notifications?.toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.translate('xpack.searchPlayground.loadConnectorsError', {
                defaultMessage:
                  'Error loading connectors. Please check your configuration and try again.',
              }),
            }
          );
        }
      },
    }
  );
};
