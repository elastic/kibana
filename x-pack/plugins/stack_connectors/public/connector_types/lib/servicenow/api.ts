/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core/public';

import {
  ActionTypeExecutorResult,
  INTERNAL_BASE_ACTION_API_PATH,
  BASE_ACTION_API_PATH,
} from '@kbn/actions-plugin/common';
import { snExternalServiceConfig } from '../../../../common/servicenow_config';
import { API_INFO_ERROR } from './translations';
import { AppInfo, RESTApiError, ServiceNowActionConnector } from './types';
import { ConnectorExecutorResult, rewriteResponseToCamelCase } from '../rewrite_response_body';
import { Choice } from './types';

export async function getChoices({
  http,
  signal,
  connectorId,
  fields,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  fields: string[];
}): Promise<ActionTypeExecutorResult<Choice[]>> {
  const res = await http.post<ConnectorExecutorResult<Choice[]>>(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'getChoices', subActionParams: { fields } },
      }),
      signal,
    }
  );
  return rewriteResponseToCamelCase(res);
}

/**
 * The app info url should be the same as at:
 * x-pack/plugins/stack_connectors/server/connector_types/cases/servicenow/service.ts
 */
const getAppInfoUrl = (url: string, scope: string) => `${url}/api/${scope}/elastic_api/health`;

export async function getAppInfo({
  http,
  signal,
  connector,
  actionTypeId,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connector: ServiceNowActionConnector;
  actionTypeId: string;
}): Promise<AppInfo | RESTApiError> {
  const {
    secrets: { username, password, clientSecret, privateKey, privateKeyPassword },
    config: { isOAuth, apiUrl, clientId, userIdentifierValue, jwtKeyId },
  } = connector;

  const urlWithoutTrailingSlash = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  let authHeader = 'Basic ' + btoa(username + ':' + password);

  if (isOAuth) {
    const tokenResponse = await http.post<{ accessToken: string }>(
      `${INTERNAL_BASE_ACTION_API_PATH}/connector/_oauth_access_token`,
      {
        body: JSON.stringify({
          type: 'jwt',
          options: {
            tokenUrl: `${urlWithoutTrailingSlash}/oauth_token.do`,
            config: {
              clientId,
              userIdentifierValue,
              jwtKeyId,
            },
            secrets: {
              clientSecret,
              privateKey,
              ...(privateKeyPassword && { privateKeyPassword }),
            },
          },
        }),
      }
    );

    const { accessToken } = tokenResponse;
    authHeader = accessToken;
  }

  const config = snExternalServiceConfig[actionTypeId];
  const response = await fetch(getAppInfoUrl(urlWithoutTrailingSlash, config.appScope ?? ''), {
    method: 'GET',
    signal,
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    throw new Error(API_INFO_ERROR(response.status));
  }

  const data = await response.json();

  return {
    ...data.result,
  };
}
