/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { argv } from 'yargs';
import { execSync } from 'child_process';
import moment from 'moment';
import path from 'path';
import fs from 'fs';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { getEsClient } from '../shared/get_es_client';
import { parseIndexUrl } from '../shared/parse_index_url';

async function run() {
  const archiveName = 'apm_8.0.0';

  const esUrl = argv['es-url'] as string | undefined;

  if (!esUrl) {
    throw new Error('--es-url is not set');
  }
  const kibanaUrl = argv['kibana-url'] as string | undefined;

  if (!kibanaUrl) {
    throw new Error('--kibana-url is not set');
  }
  const gte = moment().subtract(1, 'hour').toISOString();
  const lt = moment(gte).add(30, 'minutes').toISOString();

  // include important APM data and ML data
  const should = [
    {
      index: 'apm-*-transaction,apm-*-span,apm-*-error,apm-*-metric',
      bool: {
        must_not: [
          {
            terms: {
              'service.name': [
                'elastic-co-frontend',
                'filebeat',
                'metricbeat',
                'heartbeat',
                'apm-server',
              ],
            },
          },
        ],
        filter: [
          {
            terms: {
              'processor.event': ['transaction', 'span', 'error', 'metric'],
            },
          },
          {
            range: {
              '@timestamp': {
                gte,
                lt,
              },
            },
          },
        ],
      },
    },
    {
      index: '.ml-anomalies-shared',
      bool: {
        filter: [
          {
            term: {
              _index: '.ml-anomalies-shared',
            },
          },
          {
            range: {
              timestamp: {
                gte,
                lt,
              },
            },
          },
        ],
      },
    },
    {
      index: '.ml-config',
      bool: {
        filter: [
          {
            term: {
              _index: '.ml-config',
            },
          },
          {
            term: {
              groups: 'apm',
            },
          },
        ],
      },
    },
  ];

  // eslint-disable-next-line no-console
  console.log(`Archiving from ${gte} to ${lt}...`);

  // APM data uses '@timestamp' (ECS), ML data uses 'timestamp'

  const query = {
    bool: {
      should: should.map(({ bool }) => ({ bool })) as QueryDslQueryContainer[],
      minimum_should_match: 1,
    },
  };

  const root = path.join(__dirname, '../../../../..');

  const options = parseIndexUrl(esUrl);

  const client = getEsClient({
    node: options.node,
  });

  const response = await client.search({
    body: {
      query,
      aggs: {
        index: {
          terms: {
            field: '_index',
            size: 1000,
          },
        },
      },
    },
    index: should.map(({ index }) => index),
  });

  // only store data for indices that actually have docs
  // for performance reasons, by looking at the search
  // profile
  const indicesWithDocs =
    response.body.aggregations?.index.buckets.map(
      // @ts-expect-error bucket has any type
      (bucket) => bucket.key as string
    ) ?? [];

  const indicesToArchive = indicesWithDocs.join(',');

  // create the archive
  const tmpDir = path.join(__dirname, 'tmp/');
  execSync(
    `node scripts/es_archiver save ${path.join(
      tmpDir,
      archiveName
    )} ${indicesToArchive} --kibana-url=${kibanaUrl} --es-url=${esUrl} --query='${JSON.stringify(
      query
    )}'`,
    {
      cwd: root,
      stdio: 'inherit',
    }
  );

  const currentConfig = {};

  // get the current metadata and extend/override metadata for the new archive
  const configFilePath = path.join(tmpDir, 'archives_metadata.ts');

  try {
    Object.assign(currentConfig, (await import(configFilePath)).default);
  } catch (error) {
    // do nothing
  }

  const newConfig = {
    ...currentConfig,
    [archiveName]: {
      start: gte,
      end: lt,
    },
  };

  fs.writeFileSync(
    configFilePath,
    `
    /* eslint-disable-next-line*/
    export default ${JSON.stringify(newConfig, null, 2)}`,
    { encoding: 'utf-8' }
  );

  const esArchiverDir = 'fixtures/es_archiver/';

  const apiIntegrationDir = path.join(
    root,
    'x-pack/test/apm_api_integration/common',
    esArchiverDir
  );
  const e2eDir = path.join(__dirname, '../../ftr_e2e/cypress', esArchiverDir);

  // Copy generated files to e2e test folder
  execSync(`cp -r ${tmpDir} ${e2eDir}`);

  // Copy generated files to API integration test folder
  execSync(`cp -r ${tmpDir} ${apiIntegrationDir}`);

  // Delete tmp folder
  execSync(`rm -rf ${tmpDir}`);

  // run ESLint on the generated metadata files
  execSync('node scripts/eslint x-pack/**/*/archives_metadata.ts --fix', {
    cwd: root,
    stdio: 'inherit',
  });
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.log(err);
    process.exit(1);
  });
