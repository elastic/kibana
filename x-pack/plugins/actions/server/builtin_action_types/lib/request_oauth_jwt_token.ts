/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Logger } from '../../../../../../src/core/server';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { OAuthTokenResponse, requestOAuthToken } from './request_oauth_token';
import { RewriteResponseCase } from '../../../../actions/common';

// This is a standard for JSON Web Token (JWT) Profile
// for OAuth 2.0 Client Authentication and Authorization Grants https://datatracker.ietf.org/doc/html/rfc7523#section-8.1
export const OAUTH_JWT_BEARER_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

interface JWTOAuthRequestParams {
  assertion: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

const rewriteBodyRequest: RewriteResponseCase<JWTOAuthRequestParams> = ({
  clientId,
  clientSecret,
  ...res
}) => ({
  ...res,
  client_id: clientId,
  client_secret: clientSecret,
});

export async function requestOAuthJWTToken(
  tokenUrl: string,
  params: JWTOAuthRequestParams,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): Promise<OAuthTokenResponse> {
  return await requestOAuthToken<JWTOAuthRequestParams>(
    tokenUrl,
    OAUTH_JWT_BEARER_GRANT_TYPE,
    configurationUtilities,
    logger,
    rewriteBodyRequest(params)
  );
}
