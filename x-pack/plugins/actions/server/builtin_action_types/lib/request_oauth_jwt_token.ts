/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import axios from 'axios';
import stringify from 'json-stable-stringify';
import { request } from '../lib/axios_utils';
import { Logger } from '../../../../../../src/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';

// This is a standard for JSON Web Token (JWT) Profile
// for OAuth 2.0 Client Authentication and Authorization Grants https://datatracker.ietf.org/doc/html/rfc7523#section-8.1
export const OAUTH_JWT_BEARER_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

export interface OAuthJWTTokenResponse {
  scope?: string;
  tokenType: string;
  expiresIn: number;
  accessToken: string;
}

export async function requestOAuthJWTToken(
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  assertion: string,
  tokenUrl: string,
  clientId?: string,
  clientSecret?: string,
  scope?: string
): Promise<OAuthJWTTokenResponse> {
  const axiosInstance = axios.create();

  const res = await request({
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    data: qs.stringify({
      grant_type: OAUTH_JWT_BEARER_GRANT_TYPE,
      client_id: clientId,
      client_secret: clientSecret,
      assertion,
      scope,
    }),
    method: 'post',
    axios: axiosInstance,
    url: tokenUrl,
    logger,
    configurationUtilities,
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
