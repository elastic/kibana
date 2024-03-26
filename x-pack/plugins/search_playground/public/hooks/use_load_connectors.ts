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
import { OPENAI_CONNECTOR_ID } from '@kbn/stack-connectors-plugin/public/common';
import { useKibana } from './use_kibana';

const QUERY_KEY = ['search-playground, load-connectors'];

const ActionTypeID = {
  openai: OPENAI_CONNECTOR_ID,
};

const mapActionTypeToTransform: Record<
  typeof ActionTypeID[keyof typeof ActionTypeID],
  (connector: ActionConnector) => PlaygroundConnector
> = {
  [ActionTypeID.openai]: (connector) => ({
    ...connector,
    title: i18n.translate('xpack.searchPlayground.openAIConnectorTitle', {
      defaultMessage: 'OpenAI',
    }),
  }),
};

type PlaygroundConnector = ActionConnector & { title: string };

export const useLoadConnectors = (): UseQueryResult<PlaygroundConnector[], IHttpFetchError> => {
  const {
    services: { http, notifications },
  } = useKibana();

  return useQuery(
    QUERY_KEY,
    async () => {
      const queryResult = await loadConnectors({ http });
      return Object.values(ActionTypeID).reduce<PlaygroundConnector[]>((result, actionTypeId) => {
        const targetConnector = queryResult.find(
          (connector) => !connector.isMissingSecrets && connector.actionTypeId === actionTypeId
        );

        return targetConnector
          ? [...result, mapActionTypeToTransform[actionTypeId](targetConnector)]
          : result;
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
