/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineSAMLRoutes } from './saml';
import { RouteDefinitionParams } from '..';

export function defineAuthenticationRoutes(params: RouteDefinitionParams) {
  if (params.config.authc.providers.includes('saml')) {
    defineSAMLRoutes(params);
  }
}
