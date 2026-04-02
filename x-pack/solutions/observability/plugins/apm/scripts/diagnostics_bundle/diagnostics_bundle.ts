/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { Client, HttpConnection } from '@elastic/elasticsearch';
import fs from 'fs/promises';
import type {
  APMIndices,
  APIReturnType as SourcesAPIReturnType,
} from '@kbn/apm-sources-access-plugin/server';
import type { APIReturnType } from '../../public/services/rest/create_call_apm_api';
import { getDiagnosticsBundle } from '../../server/routes/diagnostics/get_diagnostics_bundle';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

interface KbnClientOpts {
  baseURL?: string;
  auth?: { username: string; password: string };
  headers: Record<string, string>;
}

async function kbnFetch<T>(path: string, opts: KbnClientOpts): Promise<T> {
  const url = `${opts.baseURL ?? ''}${path}`;
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.auth) {
    headers.Authorization = `Basic ${Buffer.from(
      `${opts.auth.username}:${opts.auth.password}`
    ).toString('base64')}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Request to ${path} failed with status ${response.status}: ${errorText}`);
  }
  return (await response.json()) as T;
}

export async function initDiagnosticsBundle({
  esHost,
  kbHost,
  cloudId,
  username,
  password,
  apiKey,
  start,
  end,
  kuery,
}: {
  esHost?: string;
  kbHost?: string;
  cloudId?: string;
  start: number | undefined;
  end: number | undefined;
  kuery: string | undefined;
  username?: string;
  password?: string;
  apiKey?: string;
}) {
  const auth = username && password ? { username, password } : undefined;
  const apiKeyHeader: Record<string, string> = apiKey ? { Authorization: `ApiKey ${apiKey}` } : {};
  const parsedCloudId = parseCloudId(cloudId);

  const esClient = new Client({
    ...(esHost ? { node: esHost } : {}),
    ...(cloudId ? { cloud: { id: cloudId } } : {}),
    auth,
    headers: { ...apiKeyHeader },
    Connection: HttpConnection,
    requestTimeout: 30_000,
  });

  const kibanaClientOpts: KbnClientOpts = {
    baseURL: kbHost ?? parsedCloudId.kibanaHost,
    auth,
    headers: {
      'kbn-xsrf': 'true',
      'elastic-api-version': '2023-10-31',
      'x-elastic-internal-origin': 'Kibana',
      ...apiKeyHeader,
    },
  };

  const apmIndices = await getApmIndices(kibanaClientOpts);

  const bundle = await getDiagnosticsBundle({
    esClient,
    apmIndices,
    start,
    end,
    kuery,
  });
  const fleetPackageInfo = await getFleetPackageInfo(kibanaClientOpts);
  const kibanaVersion = await getKibanaVersion(kibanaClientOpts);

  await saveReportToFile({ ...bundle, fleetPackageInfo, kibanaVersion });
}

async function saveReportToFile(combinedReport: DiagnosticsBundle) {
  const filename = `apm-diagnostics-${combinedReport.kibanaVersion}-${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(combinedReport, null, 2), {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log(`Diagnostics report written to "${filename}"`);
}

async function getApmIndices(kbnClientOpts: KbnClientOpts): Promise<APMIndices> {
  type Response = SourcesAPIReturnType<'GET /internal/apm-sources/settings/apm-indices'>;
  return kbnFetch<Response>('/internal/apm-sources/settings/apm-indices', kbnClientOpts);
}

async function getFleetPackageInfo(kbnClientOpts: KbnClientOpts) {
  const data = await kbnFetch<{ item: { version: string; status: string } }>(
    '/api/fleet/epm/packages/apm',
    kbnClientOpts
  );
  return {
    version: data.item.version,
    isInstalled: data.item.status === 'installed',
  };
}

async function getKibanaVersion(kbnClientOpts: KbnClientOpts) {
  const data = await kbnFetch<{ version: { number: string } }>('/api/status', kbnClientOpts);
  return data.version.number;
}

function parseCloudId(cloudId?: string) {
  if (!cloudId) {
    return {};
  }

  const [instanceAlias, encodedString] = cloudId.split(':');
  const decodedString = Buffer.from(encodedString, 'base64').toString('utf8');
  const [hostname, esId, kbId] = decodedString.split('$');

  return {
    kibanaHost: `https://${kbId}.${hostname}`,
    esHost: `https://${esId}.${hostname}`,
    instanceAlias,
  };
}
