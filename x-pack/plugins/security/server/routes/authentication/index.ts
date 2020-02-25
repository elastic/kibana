/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineSessionRoutes } from './session';
import { defineSAMLRoutes } from './saml';
import { defineBasicRoutes } from './basic';
import { defineCommonRoutes } from './common';
import { defineOIDCRoutes } from './oidc';
import { RouteDefinitionParams } from '..';

export function createCustomResourceResponse(body: string, contentType: string, cspHeader: string) {
  return {
    body,
    headers: {
      'content-type': contentType,
      'cache-control': 'private, no-cache, no-store',
      'content-security-policy': cspHeader,
    },
    statusCode: 200,
  };
}

export function defineAuthenticationRoutes(params: RouteDefinitionParams) {
  defineSessionRoutes(params);
  defineCommonRoutes(params);

  if (
    params.config.authc.providers.includes('basic') ||
    params.config.authc.providers.includes('token')
  ) {
    defineBasicRoutes(params);
  }

  if (params.config.authc.providers.includes('saml')) {
    defineSAMLRoutes(params);
  }

  if (params.config.authc.providers.includes('oidc')) {
    defineOIDCRoutes(params);
  }
}
