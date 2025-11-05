/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import url from 'url';
import { kbnTestConfig } from '@kbn/test';
import { ApmSynthtraceKibanaClient, createLogger, LogLevel } from '@kbn/apm-synthtrace';

const getKibanaServerUrlWithAuth = () => {
  const kibanaServerUrl = url.format(kbnTestConfig.getUrlParts() as url.UrlObject);

  const { username, password } = kbnTestConfig.getUrlParts();
  const kibanaServerUrlWithAuth = url
    .format({
      ...url.parse(kibanaServerUrl),
      auth: `${username}:${password}`,
    })
    .slice(0, -1);
  return kibanaServerUrlWithAuth;
};
export function ApmSynthtraceKibanaClientProvider() {
  const kibanaServerUrlWithAuth = getKibanaServerUrlWithAuth();
  const kibanaClient = new ApmSynthtraceKibanaClient({
    target: kibanaServerUrlWithAuth,
    logger: createLogger(LogLevel.debug),
  });

  return kibanaClient;
}
