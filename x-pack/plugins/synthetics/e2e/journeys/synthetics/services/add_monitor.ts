/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';
import {
  privateLocationsSavedObjectId,
  privateLocationsSavedObjectName,
} from '../../../../common/saved_objects/private_locations';

export const enableMonitorManagedViaApi = async (kibanaUrl: string) => {
  try {
    await axios.post(kibanaUrl + '/internal/uptime/service/enablement', undefined, {
      auth: { username: 'elastic', password: 'changeme' },
      headers: { 'kbn-xsrf': 'true' },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const addTestMonitor = async (
  kibanaUrl: string,
  name: string,
  params: Record<string, any> = { type: 'browser' }
) => {
  const testData = {
    locations: [{ id: 'us_central', isServiceManaged: true }],
    ...(params?.type !== 'browser' ? {} : testDataMonitor),
    ...(params || {}),
    name,
  };
  try {
    await axios.post(kibanaUrl + '/internal/uptime/service/monitors', testData, {
      auth: { username: 'elastic', password: 'changeme' },
      headers: { 'kbn-xsrf': 'true' },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const getPrivateLocations = async (params: Record<string, any>) => {
  const getService = params.getService;
  const server = getService('kibanaServer');

  try {
    return await server.savedObjects.get({
      id: privateLocationsSavedObjectId,
      type: privateLocationsSavedObjectName,
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const cleanTestMonitors = async (params: Record<string, any>) => {
  const getService = params.getService;
  const server = getService('kibanaServer');

  try {
    await server.savedObjects.clean({ types: ['synthetics-monitor'] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const cleanPrivateLocations = async (params: Record<string, any>) => {
  const getService = params.getService;
  const server = getService('kibanaServer');

  try {
    await server.savedObjects.clean({
      types: [privateLocationsSavedObjectName, 'ingest-agent-policies', 'ingest-package-policies'],
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const cleanTestParams = async (params: Record<string, any>) => {
  const getService = params.getService;
  const server = getService('kibanaServer');

  try {
    await server.savedObjects.clean({ types: ['synthetics-param'] });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

export const testDataMonitor = {
  type: 'browser',
  alert: { status: { enabled: true } },
  form_monitor_type: 'single',
  enabled: true,
  schedule: { unit: 'm', number: '10' },
  'service.name': '',
  config_id: '',
  tags: [],
  timeout: '16',
  name: 'Monitor 2',
  locations: [{ id: 'us_central', isServiceManaged: true }],
  namespace: 'default',
  origin: 'ui',
  journey_id: '',
  project_id: '',
  playwright_options: '',
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_zip_url_tls_enabled: false,
  },
  params: '',
  'url.port': null,
  'source.inline.script':
    "step('Go to https://www.google.com', async () => {\n          await page.goto('https://www.google.com');\n          expect(await page.isVisible('text=Data')).toBeTruthy();\n        });",
  'source.project.content': '',
  'source.zip_url.url': '',
  'source.zip_url.username': '',
  'source.zip_url.password': '',
  'source.zip_url.folder': '',
  'source.zip_url.proxy_url': '',
  playwright_text_assertion: 'Data',
  urls: 'https://www.google.com',
  screenshots: 'on',
  synthetics_args: [],
  'filter_journeys.match': '',
  'filter_journeys.tags': [],
  ignore_https_errors: false,
  'throttling.is_enabled': true,
  'throttling.download_speed': '5',
  'throttling.upload_speed': '3',
  'throttling.latency': '20',
  'throttling.config': '5d/3u/20l',
  'ssl.certificate_authorities': '',
  'ssl.certificate': '',
  'ssl.key': '',
  'ssl.key_passphrase': '',
  'ssl.verification_mode': 'full',
  'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
};
