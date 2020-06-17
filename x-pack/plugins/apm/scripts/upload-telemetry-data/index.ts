/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This script downloads the telemetry mapping, runs the APM telemetry tasks,
// generates a bunch of randomized data based on the downloaded sample,
// and uploads it to a cluster of your choosing in the same format as it is
// stored in the telemetry cluster. Its purpose is twofold:
// - Easier testing of the telemetry tasks
// - Validate whether we can run the queries we want to on the telemetry data

import fs from 'fs';
import path from 'path';
// @ts-ignore
import { Octokit } from '@octokit/rest';
import { merge, chunk, flatten, pickBy, identity } from 'lodash';
import axios from 'axios';
import yaml from 'js-yaml';
import { Client } from 'elasticsearch';
import { argv } from 'yargs';
import { promisify } from 'util';
import { Logger } from 'kibana/server';
// @ts-ignore
import consoleStamp from 'console-stamp';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CollectTelemetryParams } from '../../server/lib/apm_telemetry/collect_data_telemetry';
import { downloadTelemetryTemplate } from './download-telemetry-template';
import mapping from '../../mappings.json';
import { generateSampleDocuments } from './generate-sample-documents';

consoleStamp(console, '[HH:MM:ss.l]');

const githubToken = process.env.GITHUB_TOKEN;

if (!githubToken) {
  throw new Error('GITHUB_TOKEN was not provided.');
}

const kibanaConfigDir = path.join(__filename, '../../../../../../config');
const kibanaDevConfig = path.join(kibanaConfigDir, 'kibana.dev.yml');
const kibanaConfig = path.join(kibanaConfigDir, 'kibana.yml');

const xpackTelemetryIndexName = 'xpack-phone-home';

const loadedKibanaConfig = (yaml.safeLoad(
  fs.readFileSync(
    fs.existsSync(kibanaDevConfig) ? kibanaDevConfig : kibanaConfig,
    'utf8'
  )
) || {}) as {};

const cliEsCredentials = pickBy(
  {
    'elasticsearch.username': process.env.ELASTICSEARCH_USERNAME,
    'elasticsearch.password': process.env.ELASTICSEARCH_PASSWORD,
    'elasticsearch.hosts': process.env.ELASTICSEARCH_HOST,
  },
  identity
) as {
  'elasticsearch.username'?: string;
  'elasticsearch.password'?: string;
  'elasticsearch.hosts'?: string;
};

const config = {
  'apm_oss.transactionIndices': 'apm-*',
  'apm_oss.metricsIndices': 'apm-*',
  'apm_oss.errorIndices': 'apm-*',
  'apm_oss.spanIndices': 'apm-*',
  'apm_oss.onboardingIndices': 'apm-*',
  'apm_oss.sourcemapIndices': 'apm-*',
  'elasticsearch.hosts': 'http://localhost:9200',
  ...loadedKibanaConfig,
  ...cliEsCredentials,
};

async function uploadData() {
  const octokit = new Octokit({
    auth: githubToken,
  });

  const telemetryTemplate = await downloadTelemetryTemplate(octokit);

  const kibanaMapping = mapping['apm-telemetry'];

  const httpAuth =
    config['elasticsearch.username'] && config['elasticsearch.password']
      ? {
          username: config['elasticsearch.username'],
          password: config['elasticsearch.password'],
        }
      : null;

  const client = new Client({
    host: config['elasticsearch.hosts'],
    ...(httpAuth
      ? {
          httpAuth: `${httpAuth.username}:${httpAuth.password}`,
        }
      : {}),
  });

  if (argv.clear) {
    try {
      await promisify(client.indices.delete.bind(client))({
        index: xpackTelemetryIndexName,
      });
    } catch (err) {
      // 404 = index not found, totally okay
      if (err.status !== 404) {
        throw err;
      }
    }
  }

  const axiosInstance = axios.create({
    baseURL: config['elasticsearch.hosts'],
    ...(httpAuth ? { auth: httpAuth } : {}),
  });

  const newTemplate = merge(telemetryTemplate, {
    settings: {
      index: { mapping: { total_fields: { limit: 10000 } } },
    },
  });

  // override apm mapping instead of merging
  newTemplate.mappings.properties.stack_stats.properties.kibana.properties.plugins.properties.apm = kibanaMapping;

  await axiosInstance.put(`/_template/xpack-phone-home`, newTemplate);

  const sampleDocuments = await generateSampleDocuments({
    collectTelemetryParams: {
      logger: (console as unknown) as Logger,
      indices: {
        ...config,
        apmCustomLinkIndex: '.apm-custom-links',
        apmAgentConfigurationIndex: '.apm-agent-configuration',
      },
      search: (body) => {
        return promisify(client.search.bind(client))({
          ...body,
          requestTimeout: 120000,
        }) as any;
      },
      indicesStats: (body) => {
        return promisify(client.indices.stats.bind(client))({
          ...body,
          requestTimeout: 120000,
        }) as any;
      },
      transportRequest: ((params) => {
        return axiosInstance[params.method](params.path);
      }) as CollectTelemetryParams['transportRequest'],
    },
  });

  const chunks = chunk(sampleDocuments, 250);

  await chunks.reduce<Promise<any>>((prev, documents) => {
    return prev.then(async () => {
      const body = flatten(
        documents.map((doc) => [{ index: { _index: 'xpack-phone-home' } }, doc])
      );

      return promisify(client.bulk.bind(client))({
        body,
        refresh: true,
      }).then((response: any) => {
        if (response.errors) {
          const firstError = response.items.filter(
            (item: any) => item.index.status >= 400
          )[0].index.error;
          throw new Error(`Failed to upload documents: ${firstError.reason} `);
        }
      });
    });
  }, Promise.resolve());
}

uploadData()
  .catch((e) => {
    if ('response' in e) {
      if (typeof e.response === 'string') {
        // eslint-disable-next-line no-console
        console.log(e.response);
      } else {
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify(
            e.response,
            ['status', 'statusText', 'headers', 'data'],
            2
          )
        );
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(e);
    }
    process.exit(1);
  })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Finished uploading generated telemetry data');
  });
