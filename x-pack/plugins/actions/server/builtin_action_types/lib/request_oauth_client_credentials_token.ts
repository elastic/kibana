/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import axios from 'axios';
import stringify from 'json-stable-stringify';
import { Logger } from '../../../../../../src/core/server';
import { request } from './axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';

export const OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE = 'client_credentials';

interface ClientCredentialsRequestParams {
  scope?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface ClientCredentialsResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
}

export async function requestOAuthClientCredentialsToken(
  tokenUrl: string,
  logger: Logger,
  params: ClientCredentialsRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<ClientCredentialsResponse> {
  const axiosInstance = axios.create();
  const { clientId, clientSecret, scope } = params;

  const res = await request({
    axios: axiosInstance,
    url: tokenUrl,
    method: 'post',
    logger,
    data: qs.stringify({
      scope,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    configurationUtilities,
    validateStatus: () => true,
  });

  if (res.status === 200) {
    return {
      tokenType: res.data.token_type,
      accessToken: res.data.access_token,
      expiresIn: res.data.expires_in,
    };
  } else {
    const errString = stringify(res.data);
    logger.warn(
      `error thrown getting the access token from ${tokenUrl} for clientID: ${clientId}: ${errString}`
    );
    throw new Error(errString);
  }
}
