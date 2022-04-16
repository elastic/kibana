/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import axios from 'axios';
import stringify from 'json-stable-stringify';
import { Logger } from '@kbn/core/server';
import { request } from './axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { AsApiContract } from '../../../common';

export interface OAuthTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
}

export async function requestOAuthToken<T>(
  tokenUrl: string,
  grantType: string,
  configurationUtilities: ActionsConfigurationUtilities,
  logger: Logger,
  bodyRequest: AsApiContract<T>
): Promise<OAuthTokenResponse> {
  const axiosInstance = axios.create();

  const res = await request({
    axios: axiosInstance,
    url: tokenUrl,
    method: 'post',
    logger,
    data: qs.stringify({
      ...bodyRequest,
      grant_type: grantType,
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
      `error thrown getting the access token from ${tokenUrl} for params: ${JSON.stringify(
        bodyRequest
      )}: ${errString}`
    );
    throw new Error(errString);
  }
}
