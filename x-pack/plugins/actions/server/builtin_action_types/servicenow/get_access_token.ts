/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import querystring from 'querystring';
import axios from 'axios';
import { getErrorMessage, request } from '../lib/axios_utils';
import { Logger } from '../../../../../../src/core/server';
import * as i18n from './translations';
import { ActionsConfigurationUtilities } from '../../actions_config';

export interface OAuthTokenResponse {
  scope: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  access_token: string;
}

export async function getInitialAccessToken(
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  clientId: string,
  clientSecret: string,
  username: string,
  password: string,
  serviceNowBaseUrl: string
): Promise<OAuthTokenResponse> {
  const oauthTokenUrl = `${serviceNowBaseUrl}/oauth_token.do`;
  const axiosInstance = axios.create();

  try {
    const res = await request({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: querystring.stringify({
        grant_type: 'password',
        client_id: clientId,
        client_secret: clientSecret,
        username,
        password,
      }),
      method: 'post',
      axios: axiosInstance,
      url: oauthTokenUrl,
      logger,
      configurationUtilities,
    });
    return res.status === 200 && res.data ? res.data : {};
  } catch (error) {
    throw new Error(
      getErrorMessage(
        i18n.SERVICENOW,
        `Unable to get access token. Error: ${error.message} Reason: ${error.response?.data}`
      )
    );
  }
}

export async function getRefreshAccessToken(
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  serviceNowBaseUrl: string
): Promise<OAuthTokenResponse> {
  const oauthTokenUrl = `${serviceNowBaseUrl}/oauth_token.do`;
  const axiosInstance = axios.create();

  try {
    const res = await request({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: querystring.stringify({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      method: 'post',
      axios: axiosInstance,
      url: oauthTokenUrl,
      logger,
      configurationUtilities,
    });
    return res.status === 200 && res.data ? res.data : {};
  } catch (error) {
    throw new Error(
      getErrorMessage(
        i18n.SERVICENOW,
        `Unable to refresh access token. Error: ${error.message} Reason: ${error.response?.data}`
      )
    );
  }
}
