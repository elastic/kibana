/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// replaces control characters in string with ;, but leaves tabs
export function getAccessToken(actionId: string, serviceNowBaseUrl: string): string {
  const oauthTokenUrl = `${serviceNowBaseUrl}/oauth_token.do`;

  return '';
}
