/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { ConnectorToken, ConnectorTokenClientContract } from '../types';
import { GoogleAuth } from 'google-auth-library';


interface GetOAuthJwtAccessTokenOpts {
  connectorId?: string;
  logger: Logger;
  credentials: string;
  connectorTokenClient?: ConnectorTokenClientContract;
}

export const getOAuthJwtAccessToken = async ({
  connectorId,
  logger,
  credentials,
  connectorTokenClient,
}: GetOAuthJwtAccessTokenOpts) => {


  let accessToken: string | null | undefined;
  let connectorToken: ConnectorToken | null = null;
  let hasErrors: boolean = false;
  let credentialsJSON;
  const expiresInSec = 3600;
  
  if (connectorId && connectorTokenClient) {
    // Check if there is a token stored for this connector
    const { connectorToken: token, hasErrors: errors } = await connectorTokenClient.get({
      connectorId,
    });

    connectorToken = token;
    hasErrors = errors;

  }

  if (connectorToken === null || Date.parse(connectorToken.expiresAt) <= Date.now()) {
    // Save the time before requesting token so we can use it to calculate expiration
    const requestTokenStart = Date.now();

    // Validate the service account credentials JSON file input
    try {
        credentialsJSON = JSON.parse(credentials);
    } catch (error) {
        return `Failed to parse credentials JSON file: Invalid JSON format: ${error.message ?? ''}`;
    }

    // request access token with service account credentials file
    const auth = new GoogleAuth({
        credentials: credentialsJSON,
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    accessToken = await auth.getAccessToken();

    if (accessToken === null || accessToken === undefined) {
      accessToken = '';
    }

    // try to update connector_token SO
    if (connectorId && connectorTokenClient) {
      try {
        await connectorTokenClient.updateOrReplace({
          connectorId,
          token: connectorToken,
          newToken: accessToken,
          tokenRequestDate: requestTokenStart,
          expiresInSec: expiresInSec,
          deleteExisting: hasErrors,
        });
      } catch (err) {
        logger.warn(
          `Not able to update connector token for connectorId: ${connectorId} due to error: ${err.message}`
        );
      }
    }
  } else {
    // use existing valid token
    accessToken = connectorToken.token;
  }
  return accessToken;
};
