/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAPIKeyParams } from '@kbn/security-plugin/server';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { CoreKibanaRequest } from '@kbn/core-http-router-server-internal';
import type { HTTPAuthorizationHeader } from '@kbn/security-plugin/server';

import type { Logger } from '@kbn/logging';

import type {
  TransformAPIKey,
  SecondaryAuthorizationHeader,
} from '../../../common/types/models/transform_api_key';
import { appContextService } from '..';

export function isTransformApiKey(arg: any): arg is TransformAPIKey {
  return (
    arg &&
    arg.hasOwnProperty('api_key') &&
    arg.hasOwnProperty('encoded') &&
    typeof arg.encoded === 'string'
  );
}

function createKibanaRequestFromAuth(authorizationHeader: HTTPAuthorizationHeader) {
  const requestHeaders: Headers = {
    authorization: authorizationHeader.toString(),
  };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  // Since we're using API keys and accessing elasticsearch can only be done
  // via a request, we're faking one with the proper authorization headers.
  const fakeRequest = CoreKibanaRequest.from(fakeRawRequest);

  return fakeRequest;
}

/** This function generates a new API based on current Kibana's user request.headers.authorization
 * then formats it into a es-secondary-authorization header object
 * @param authorizationHeader:
 * @param createParams
 */
export async function generateTransformSecondaryAuthHeaders({
  authorizationHeader,
  createParams,
  logger,
}: {
  authorizationHeader: HTTPAuthorizationHeader | null | undefined;
  createParams?: CreateAPIKeyParams;
  logger: Logger;
}): Promise<SecondaryAuthorizationHeader | undefined> {
  if (!authorizationHeader) {
    throw Error(
      'Unable to generate secondary authorization if authorizationHeader is not provided.'
    );
  }

  const fakeKibanaRequest = createKibanaRequestFromAuth(authorizationHeader);
  const apiKeyWithCurrentUserPermission = await appContextService
    .getSecurity()
    .authc.apiKeys.grantAsInternalUser(
      fakeKibanaRequest,
      createParams ?? {
        name: `auto-generated-transform-api-key`,
        role_descriptors: {},
      }
    );

  logger.debug(`Created api_key with name: 'auto-generated-transform-api-key'`);
  let encodedApiKey: TransformAPIKey['encoded'] | null = null;

  // Property 'encoded' does exist in the resp coming back from request
  // and is required to use in authentication headers
  // It's just not defined in returned GrantAPIKeyResult type
  if (isTransformApiKey(apiKeyWithCurrentUserPermission)) {
    encodedApiKey = apiKeyWithCurrentUserPermission.encoded;
  }

  const secondaryAuth =
    encodedApiKey !== null
      ? {
          headers: {
            'es-secondary-authorization': `ApiKey ${encodedApiKey}`,
          },
        }
      : undefined;

  return secondaryAuth;
}
