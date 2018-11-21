/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import chrome from 'ui/chrome';
import { UptimeMonitoringApp } from '../components/uptime_app';
import { createApolloClient } from '../lib/adapters/framework/apollo_client_adapter';
import { UMFrontendLibs } from '../lib/lib';

export async function startApp(libs: UMFrontendLibs) {
  const uriPath = `${chrome.getBasePath()}/api/uptime_monitoring/graphql`;
  const xsrfHeader = chrome.getXsrfToken();
  const graphQLClient = createApolloClient(uriPath, xsrfHeader);
  libs.framework.render(<UptimeMonitoringApp client={graphQLClient} />);
}
