/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '..';
import { defineCommonRoutes } from './common';
import { defineOIDCRoutes } from './oidc';
import { defineSAMLRoutes } from './saml';

export function defineAuthenticationRoutes(params: RouteDefinitionParams) {
  defineCommonRoutes(params);

  if (params.config.authc.sortedProviders.some(({ type }) => type === 'saml')) {
    defineSAMLRoutes(params);
  }

  if (params.config.authc.sortedProviders.some(({ type }) => type === 'oidc')) {
    defineOIDCRoutes(params);
  }
}
