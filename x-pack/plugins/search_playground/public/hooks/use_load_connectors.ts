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
} from '@kbn/stack-connectors-plugin/public/common';
import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useKibana } from './use_kibana';
import { LLMs } from '../types';

const QUERY_KEY = ['search-playground, load-connectors'];

type OpenAIConnector = UserConfiguredActionConnector<
  { apiProvider: OpenAiProviderType },
  Record<string, unknown>
>;

const mapLLMToActionParam: Record<
  LLMs,
  {
    actionId: string;
    actionProvider?: string;
    match: (connector: ActionConnector) => boolean;
    transform: (connector: ActionConnector) => PlaygroundConnector;
  }
> = {
  [LLMs.openai_azure]: {
    actionId: OPENAI_CONNECTOR_ID,
    actionProvider: OpenAiProviderType.AzureAi,
    match: (connector) =>
      (connector as OpenAIConnector).config.apiProvider === OpenAiProviderType.AzureAi,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIAzureConnectorTitle', {
        defaultMessage: 'OpenAI Azure',
      }),
    }),
  },
  [LLMs.openai]: {
    actionId: OPENAI_CONNECTOR_ID,
    match: (connector) =>
      (connector as OpenAIConnector).config.apiProvider === OpenAiProviderType.OpenAi,
    transform: (connector) => ({
      ...connector,
      title: i18n.translate('xpack.searchPlayground.openAIConnectorTitle', {
        defaultMessage: 'OpenAI',
      }),
    }),
  },
};

type PlaygroundConnector = ActionConnector & { title: string };

export const useLoadConnectors = (): UseQueryResult<
  Record<LLMs, PlaygroundConnector>,
  IHttpFetchError
> => {
  const {
    services: { http, notifications },
  } = useKibana();

  return useQuery(
    QUERY_KEY,
    async () => {
      const queryResult = await loadConnectors({ http });

      return Object.entries(mapLLMToActionParam).reduce<Partial<Record<LLMs, PlaygroundConnector>>>(
        (result, [llm, { actionId, match, transform }]) => {
          const targetConnector = queryResult.find(
            (connector) =>
              !connector.isMissingSecrets &&
              connector.actionTypeId === actionId &&
              (match?.(connector) ?? true)
          );

          return targetConnector ? { ...result, [llm]: transform(targetConnector) } : result;
        },
        {}
      );
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
