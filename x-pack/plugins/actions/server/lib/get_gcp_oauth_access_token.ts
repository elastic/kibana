/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { GoogleAuth } from 'google-auth-library';
import { ConnectorToken, ConnectorTokenClientContract } from '../types';

interface GetOAuthJwtAccessTokenOpts {
  connectorId?: string;
  logger: Logger;
  credentials: object;
  connectorTokenClient?: ConnectorTokenClientContract;
}
export const getGoogleOAuthJwtAccessToken = async ({
  connectorId,
  logger,
  credentials,
  connectorTokenClient,
}: GetOAuthJwtAccessTokenOpts) => {
  let accessToken;
  let connectorToken: ConnectorToken | null = null;
  let hasErrors: boolean = false;
  const expiresInSec = 3500;

  if (connectorId && connectorTokenClient) {
    try {
      // Check if there is a token stored for this connector
      const { connectorToken: token, hasErrors: errors } = await connectorTokenClient.get({
        connectorId,
      });
      connectorToken = token;
      hasErrors = errors;
    } catch (error) {
      logger.warn(
        `Failed to get connector token for connectorId: ${connectorId}. Error: ${error.message}`
      );
    }
  }

  if (!connectorToken || Date.parse(connectorToken.expiresAt) <= Date.now()) {
    const requestTokenStart = Date.now();

    // Request access token with service account credentials file
    const auth = new GoogleAuth({
      credentials,
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
    });

    try {
      accessToken = await auth.getAccessToken();
    } catch (error) {
      throw new Error(
        `Unable to retrieve access token. Ensure the service account has the right permissions and the Vertex AI endpoint is enabled in the GCP project. Error: ${error.message}`
      );
    }

    if (!accessToken) {
      throw new Error(
        `Error occurred while retrieving the access token. Ensure that the credentials are vaild.`
      );
    }

    // Try to update connector token
    if (connectorId && connectorTokenClient) {
      try {
        await connectorTokenClient.updateOrReplace({
          connectorId,
          token: connectorToken,
          newToken: accessToken,
          tokenRequestDate: requestTokenStart,
          expiresInSec,
          deleteExisting: hasErrors,
        });
      } catch (err) {
        logger.warn(
          `Not able to update connector token for connectorId: ${connectorId} due to error: ${err.message}`
        );
      }
    }
  } else {
    // Use existing valid token
    accessToken = connectorToken.token;
  }

  return accessToken;
};
