/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { ServerError } from '@kbn/cases-plugin/public/types';
import { loadAllActions as loadConnectors } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import type { IToasts } from '@kbn/core-notifications-browser';
import * as i18n from '../translations';
import { useHttp } from '../../../lib/kibana';

export interface Props {
  actionTypeId: string;
  toasts?: IToasts;
}

/**
 * Hook to load all connectors for a given action type.
 * @param actionTypeId
 * @param toasts
 */
export const useLoadConnectors = ({
  actionTypeId,
  toasts,
}: Props): UseQueryResult<ActionConnector[], IHttpFetchError> => {
  const http = useHttp();

  return useQuery(
    ['load-connectors', actionTypeId],
    async () => {
      const queryResult = await loadConnectors({ http });
      const filteredData = queryResult.filter(
        (connector) => !connector.isMissingSecrets && connector.actionTypeId === actionTypeId
      );

      return filteredData;
    },
    {
      retry: false,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts?.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: i18n.LOAD_CONNECTORS_ERROR_MESSAGE,
            }
          );
        }
      },
    }
  );
};
