/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { Client } from '@elastic/elasticsearch';
import fs from 'fs/promises';
import axios, { AxiosInstance } from 'axios';
import { APIReturnType } from '../../public/services/rest/create_call_apm_api';
import { getDiagnosticsBundle } from '../../server/routes/diagnostics/get_diagnostics_bundle';
import { ApmIndicesConfig } from '../../server/routes/settings/apm_indices/get_apm_indices';

type DiagnosticsBundle = APIReturnType<'GET /internal/apm/diagnostics'>;

export async function initDiagnosticsBundle({
  esHost,
  kbHost,
  username,
  password,
  start,
  end,
  kuery,
}: {
  esHost: string;
  kbHost: string;
  username: string;
  password: string;
  start: number | undefined;
  end: number | undefined;
  kuery: string | undefined;
}) {
  const esClient = new Client({ node: esHost, auth: { username, password } });

  const kibanaClient = axios.create({
    baseURL: kbHost,
    auth: { username, password },
  });
  const apmIndices = await getApmIndices(kibanaClient);
  const bundle = await getDiagnosticsBundle({
    esClient,
    apmIndices,
    start,
    end,
    kuery,
  });
  const fleetPackageInfo = await getFleetPackageInfo(kibanaClient);
  const kibanaVersion = await getKibanaVersion(kibanaClient);

  await saveReportToFile({ ...bundle, fleetPackageInfo, kibanaVersion });
}

async function saveReportToFile(combinedReport: DiagnosticsBundle) {
  const filename = `apm-diagnostics-${
    combinedReport.kibanaVersion
  }-${Date.now()}.json`;
  await fs.writeFile(filename, JSON.stringify(combinedReport, null, 2), {
    encoding: 'utf8',
    flag: 'w',
  });
  console.log(`Diagnostics report written to "${filename}"`);
}

async function getApmIndices(kibanaClient: AxiosInstance) {
  interface Response {
    apmIndexSettings: Array<{
      configurationName: string;
      defaultValue: string;
      savedValue?: string;
    }>;
  }

  const res = await kibanaClient.get<Response>(
    '/internal/apm/settings/apm-index-settings'
  );

  return Object.fromEntries(
    res.data.apmIndexSettings.map(
      ({ configurationName, defaultValue, savedValue }) => [
        configurationName,
        savedValue ?? defaultValue,
      ]
    )
  ) as ApmIndicesConfig;
}

async function getFleetPackageInfo(kibanaClient: AxiosInstance) {
  const res = await kibanaClient.get('/api/fleet/epm/packages/apm');
  return {
    version: res.data.response.version,
    isInstalled: res.data.response.status,
  };
}

async function getKibanaVersion(kibanaClient: AxiosInstance) {
  const res = await kibanaClient.get('/api/status');
  return res.data.version.number;
}
