/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { snExternalServiceConfig } from '../../../../../../actions/server/builtin_action_types/servicenow/config';
import { BASE_ACTION_API_PATH } from '../../../constants';
import { API_INFO_ERROR } from './translations';
import { AppInfo, RESTApiError } from './types';
import { ConnectorExecutorResult, rewriteResponseToCamelCase } from '../rewrite_response_body';
import { ActionTypeExecutorResult } from '../../../../../../actions/common';
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
 * x-pack/plugins/actions/server/builtin_action_types/servicenow/service.ts
 */
const getAppInfoUrl = (url: string, scope: string) => `${url}/api/${scope}/elastic_api/health`;

export async function getAppInfo({
  signal,
  apiUrl,
  username,
  password,
  actionTypeId,
}: {
  signal: AbortSignal;
  apiUrl: string;
  username: string;
  password: string;
  actionTypeId: string;
}): Promise<AppInfo | RESTApiError> {
  const urlWithoutTrailingSlash = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const config = snExternalServiceConfig[actionTypeId];
  const response = await fetch(getAppInfoUrl(urlWithoutTrailingSlash, config.appScope ?? ''), {
    method: 'GET',
    signal,
    headers: {
      Authorization: 'Basic ' + btoa(username + ':' + password),
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
