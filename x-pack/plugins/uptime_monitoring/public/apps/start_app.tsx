/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'react-vis/dist/style.css';
import 'ui-bootstrap';
import 'ui/autoload/all';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import 'ui/courier';
import 'ui/persisted_log';
import 'uiExports/autocompleteProviders';
import { createApolloClient } from '../lib/adapters/framework/apollo_client_adapter';
import { UMFrontendLibs } from '../lib/lib';
import { UptimeMonitoringApp } from '../uptime_monitoring_app';

export async function startApp(libs: UMFrontendLibs) {
  const uriPath = `${chrome.getBasePath()}/api/uptime_monitoring/graphql`;
  const xsrfHeader = chrome.getXsrfToken();
  const graphQLClient = createApolloClient(uriPath, xsrfHeader);
  libs.framework.render(UptimeMonitoringApp, graphQLClient);
}
