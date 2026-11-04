/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { SAMPLE_DATA_SETS } from '@kbn/isomer-corpus';
import type { FtrProviderContext } from '../../functional/ftr_provider_context';

/** Sample data is installed relative to this instant and every relative time range resolves to it. */
const DEFAULT_NOW = '2025-01-15T12:00:00.000Z';
const DEFAULT_OUTPUT_DIR = Path.resolve(
  REPO_ROOT,
  'x-pack/platform/packages/shared/isomer/isomer-corpus/captures'
);
export const AS_CODE_API_VERSION = '2023-10-31';

const parseList = (value: string | undefined): string[] | undefined =>
  value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

/** The run's settings, from `ISOMER_CORPUS_*` environment variables (see the package README). */
export const getRunSettings = () => {
  const now = new Date(process.env.ISOMER_CORPUS_NOW ?? DEFAULT_NOW);
  if (Number.isNaN(now.getTime())) {
    throw new Error(`ISOMER_CORPUS_NOW is not a date: ${process.env.ISOMER_CORPUS_NOW}`);
  }
  return {
    now,
    outputRoot: Path.resolve(process.env.ISOMER_CORPUS_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
    onlyDashboards: parseList(process.env.ISOMER_CORPUS_DASHBOARDS),
  };
};

/**
 * Installs the sample data sets against `now` and returns each set's overview dashboard ID. With
 * `reinstall`, an installed set is removed first, so its data is shifted relative to `now` rather
 * than to an earlier install.
 */
export const installSampleData = async (
  supertest: ReturnType<FtrProviderContext['getService']>,
  now: Date,
  { reinstall }: { reinstall: boolean }
): Promise<Map<string, string>> => {
  const list = async () =>
    (await supertest.get('/api/sample_data').expect(200)).body as Array<{
      id: string;
      status: string;
      overviewDashboard: string;
    }>;

  const installed = new Set(
    (await list()).filter(({ status }) => status === 'installed').map(({ id }) => id)
  );
  for (const dataSet of SAMPLE_DATA_SETS) {
    if (installed.has(dataSet) && !reinstall) {
      continue;
    }
    if (installed.has(dataSet)) {
      await supertest.delete(`/api/sample_data/${dataSet}`).set('kbn-xsrf', 'true');
    }
    await supertest
      .post(`/api/sample_data/${dataSet}`)
      .query({ now: now.toISOString() })
      .set('kbn-xsrf', 'true')
      .expect(200);
  }
  return new Map((await list()).map(({ id, overviewDashboard }) => [id, overviewDashboard]));
};
