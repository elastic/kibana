/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '../../../../../../src/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { OAuthTokenResponse, requestOAuthToken } from './request_oauth_token';

export const OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE = 'client_credentials';

export interface ClientCredentialsOAuthRequestParams {
  scope?: string;
  clientId?: string;
  clientSecret?: string;
}

export async function requestOAuthClientCredentialsToken(
  tokenUrl: string,
  logger: Logger,
  params: ClientCredentialsOAuthRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<OAuthTokenResponse> {
  return await requestOAuthToken<ClientCredentialsOAuthRequestParams>(
    tokenUrl,
    params,
    OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE,
    configurationUtilities,
    logger
  );
}
