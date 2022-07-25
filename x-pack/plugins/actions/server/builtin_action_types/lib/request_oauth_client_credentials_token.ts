/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { OAuthTokenResponse, requestOAuthToken } from './request_oauth_token';
import { RewriteResponseCase } from '../../../common';

export const OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE = 'client_credentials';

export interface ClientCredentialsOAuthRequestParams {
  scope?: string;
  clientId?: string;
  clientSecret?: string;
}

const rewriteBodyRequest: RewriteResponseCase<ClientCredentialsOAuthRequestParams> = ({
  clientId,
  clientSecret,
  ...res
}) => ({
  ...res,
  client_id: clientId,
  client_secret: clientSecret,
});

export async function requestOAuthClientCredentialsToken(
  tokenUrl: string,
  logger: Logger,
  params: ClientCredentialsOAuthRequestParams,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<OAuthTokenResponse> {
  return await requestOAuthToken<ClientCredentialsOAuthRequestParams>(
    tokenUrl,
    OAUTH_CLIENT_CREDENTIALS_GRANT_TYPE,
    configurationUtilities,
    logger,
    rewriteBodyRequest(params)
  );
}
