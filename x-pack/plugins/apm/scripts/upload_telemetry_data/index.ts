/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// This script downloads the telemetry mapping, runs the APM telemetry tasks,
// generates a bunch of randomized data based on the downloaded sample,
// and uploads it to a cluster of your choosing in the same format as it is
// stored in the telemetry cluster. Its purpose is twofold:
// - Easier testing of the telemetry tasks
// - Validate whether we can run the queries we want to on the telemetry data

import { merge, chunk, flatten, omit } from 'lodash';
import { argv } from 'yargs';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Logger } from 'kibana/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CollectTelemetryParams } from '../../server/lib/apm_telemetry/collect_data_telemetry';
import { downloadTelemetryTemplate } from '../shared/download_telemetry_template';
import { mergeApmTelemetryMapping } from '../../common/apm_telemetry';
import { generateSampleDocuments } from './generate_sample_documents';
import { readKibanaConfig } from '../shared/read_kibana_config';
import { getHttpAuth } from '../shared/get_http_auth';
import { createOrUpdateIndex } from '../shared/create_or_update_index';
import { getEsClient } from '../shared/get_es_client';

async function uploadData() {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error('GITHUB_TOKEN was not provided.');
  }

  const xpackTelemetryIndexName = 'xpack-phone-home';
  const telemetryTemplate = await downloadTelemetryTemplate({
    githubToken,
  });

  const config = readKibanaConfig();

  const httpAuth = getHttpAuth(config);

  const client = getEsClient({
    node: config['elasticsearch.hosts'],
    ...(httpAuth
      ? {
          auth: { ...httpAuth, username: 'elastic' },
        }
      : {}),
  });

  // The new template is the template downloaded from the telemetry repo, with
  // our current telemetry mapping merged in, with the "index_patterns" key
  // (which cannot be used when creating an index) removed.
  const newTemplate = omit(
    mergeApmTelemetryMapping(
      merge(telemetryTemplate, {
        index_patterns: undefined,
        settings: {
          index: { mapping: { total_fields: { limit: 10000 } } },
        },
      })
    ),
    'index_patterns'
  );

  await createOrUpdateIndex({
    indexName: xpackTelemetryIndexName,
    client,
    template: newTemplate,
    clear: !!argv.clear,
  });

  const sampleDocuments = await generateSampleDocuments({
    collectTelemetryParams: {
      logger: console as unknown as Logger,
      indices: {
        transaction: config['xpack.apm.indices.transaction'],
        metric: config['xpack.apm.indices.metric'],
        error: config['xpack.apm.indices.error'],
        span: config['xpack.apm.indices.span'],
        onboarding: config['xpack.apm.indices.onboarding'],
        sourcemap: config['xpack.apm.indices.sourcemap'],
        apmCustomLinkIndex: '.apm-custom-links',
        apmAgentConfigurationIndex: '.apm-agent-configuration',
      },
      search: (body) => {
        return client.search(body) as Promise<any>;
      },
      indicesStats: (body) => {
        return client.indices.stats(body);
      },
      transportRequest: ((params) => {
        return;
      }) as CollectTelemetryParams['transportRequest'],
    },
  });

  const chunks = chunk(sampleDocuments, 250);

  await chunks.reduce<Promise<any>>((prev, documents) => {
    return prev.then(async () => {
      const body = flatten(
        documents.map((doc) => [
          { index: { _index: xpackTelemetryIndexName } },
          doc,
        ])
      );

      return client
        .bulk({
          body,
          refresh: 'wait_for',
        })
        .then((response: any) => {
          if (response.errors) {
            const firstError = response.items.filter(
              (item: any) => item.index.status >= 400
            )[0].index.error;
            throw new Error(
              `Failed to upload documents: ${firstError.reason} `
            );
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
