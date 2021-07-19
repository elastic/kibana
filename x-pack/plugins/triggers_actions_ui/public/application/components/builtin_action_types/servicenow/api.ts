/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../constants';
import { AppInfo, RESTApiError } from './types';

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
}): Promise<Record<string, any>> {
  return await http.post(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'getChoices', subActionParams: { fields } },
      }),
      signal,
    }
  );
}

// TODO: When app is certified change x_463134_elastic to the published namespace.
const getAppInfoUrl = (url: string) => `${url}/api/x_463134_elastic/elastic/health`;

export async function getAppInfo({
  signal,
  apiUrl,
  username,
  password,
}: {
  signal: AbortSignal;
  apiUrl: string;
  username: string;
  password: string;
}): Promise<AppInfo | RESTApiError> {
  const urlWithoutTrailingSlash = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const response = await fetch(getAppInfoUrl(urlWithoutTrailingSlash), {
    method: 'GET',
    signal,
    headers: {
      Authorization: 'Basic ' + btoa(username + ':' + password),
    },
  });

  if (!response.ok) {
    throw new Error(`Received status: ${response.status} when attempting to get app info`);
  }

  const data = await response.json();

  return {
    ...data.result,
  };
}
