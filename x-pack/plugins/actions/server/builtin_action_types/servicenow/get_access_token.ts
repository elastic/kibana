/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import querystring from 'querystring';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { getErrorMessage, request } from '../lib/axios_utils';
import { Logger } from '../../../../../../src/core/server';
import * as i18n from './translations';
import { ActionsConfigurationUtilities } from '../../actions_config';

export interface OAuthJWTTokenResponse {
  scope: string;
  token_type: string;
  expires_in: number;
  access_token: string;
}

export async function getAccessToken(
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  clientId: string,
  clientSecret: string,
  keyId: string,
  privateKey: string,
  userEmail: string,
  serviceNowBaseUrl: string
): Promise<OAuthJWTTokenResponse> {
  const oauthTokenUrl = `${serviceNowBaseUrl}/oauth_token.do`;
  const axiosInstance = axios.create();

  const assertion = await createJWTToken(logger, clientId, privateKey, userEmail, keyId);
  try {
    const res = await request({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: querystring.stringify({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        client_id: clientId,
        client_secret: clientSecret,
        assertion,
      }),
      method: 'post',
      axios: axiosInstance,
      url: oauthTokenUrl,
      logger,
      configurationUtilities,
    });
    return res.status === 200 && res.data ? res.data : {};
  } catch (error) {
    const errorMessage = getErrorMessage(
      i18n.SERVICENOW,
      `Unable to get access token. Error: ${error.message} Reason: ${error.response?.data}`
    );
    logger.warn(errorMessage);
    throw new Error(errorMessage);
  }
}

export async function createJWTToken(
  logger: Logger,
  clientId: string,
  privateKey: string,
  userEmail: string,
  keyId: string
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);

  const headerObj = { algorithm: 'RS256', keyid: keyId };

  const payloadObj = {
    sub: userEmail, // subject claim identifies the principal that is the subject of the JWT
    aud: clientId, // audience claim identifies the recipients that the JWT is intended for
    iss: clientId, // issuer claim identifies the principal that issued the JWT
    iat, // issued at claim identifies the time at which the JWT was issued
    exp: iat + 3600, // expiration time claim identifies the expiration time on or after which the JWT MUST NOT be accepted for processing
  };

  try {
    const jwtToken = jwt.sign(
      JSON.stringify(payloadObj),
      {
        key: privateKey,
        passphrase: '123456',
      },
      headerObj
    );
    return jwtToken;
  } catch (error) {
    const errorMessage = getErrorMessage(
      i18n.SERVICENOW,
      `Unable to generate JWT token. Error: ${error}`
    );
    logger.warn(errorMessage);
    throw new Error(errorMessage);
  }
}
