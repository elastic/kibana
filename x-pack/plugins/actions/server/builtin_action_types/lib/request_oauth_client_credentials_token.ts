/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import axios, { AxiosResponse } from 'axios';
import { Logger } from '../../../../../../src/core/server';

interface ClientCredentialsRequestParams {
  scope?: string;
  clientId?: string;
  clientSecret?: string;
  grantType?: string;
}

interface ClientCredentialsResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
}

export async function requestOAuthClientCredentialsToken(
  tokenUrl: string,
  logger: Logger,
  params: ClientCredentialsRequestParams
): Promise<ClientCredentialsResponse> {
  const axiosInstance = axios.create();
  const { clientId, clientSecret, grantType, scope } = params;
  try {
    const res = await axiosInstance(tokenUrl, {
      method: 'post',
      data: qs.stringify({
        scope,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: grantType,
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
    });
    if (res.status === 200) {
      return res.data;
    } else {
      throw res.data;
    }
  } catch (err) {
    logger.warn(`error thrown requesting access token: ${err.message}`);
    throw err;
  }
}
