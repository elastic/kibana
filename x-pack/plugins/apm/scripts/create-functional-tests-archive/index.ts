/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { argv } from 'yargs';
import { execSync } from 'child_process';
import moment from 'moment';
import path from 'path';
import fs from 'fs';
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
            term: {
              'service.name': 'elastic-co-frontend',
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
    {
      index: '.kibana',
      bool: {
        filter: [
          {
            term: {
              type: 'ml-job',
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
      should: should.map(({ bool }) => ({ bool })),
      minimum_should_match: 1,
    },
  };

  const root = path.join(__dirname, '../../../../..');
  const commonDir = path.join(root, 'x-pack/test/apm_api_integration/common');
  const archivesDir = path.join(commonDir, 'fixtures/es_archiver');

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
      (bucket) => bucket.key as string
    ) ?? [];

  // create the archive

  execSync(
    `node scripts/es_archiver save ${archiveName} ${indicesWithDocs
      .filter((index) => !index.startsWith('.kibana'))
      .concat('.kibana')
      .join(
        ','
      )} --dir=${archivesDir} --kibana-url=${kibanaUrl} --es-url=${esUrl} --query='${JSON.stringify(
      query
    )}'`,
    {
      cwd: root,
      stdio: 'inherit',
    }
  );

  const currentConfig = {};

  // get the current metadata and extend/override metadata for the new archive
  const configFilePath = path.join(commonDir, 'archives_metadata.ts');

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
    `export default ${JSON.stringify(newConfig, null, 2)}`,
    { encoding: 'utf-8' }
  );

  // run ESLint on the generated metadata files

  execSync('node scripts/eslint **/*/archives_metadata.ts --fix', {
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
