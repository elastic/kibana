/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { identity, pick } from 'lodash';

export type KibanaConfig = ReturnType<typeof readKibanaConfig>;

export const readKibanaConfig = () => {
  const kibanaConfigDir = path.join(__filename, '../../../../../../config');
  const kibanaDevConfig = path.join(kibanaConfigDir, 'kibana.dev.yml');
  const kibanaConfig = path.join(kibanaConfigDir, 'kibana.yml');

  const loadedKibanaConfig = (yaml.safeLoad(
    fs.readFileSync(
      fs.existsSync(kibanaDevConfig) ? kibanaDevConfig : kibanaConfig,
      'utf8'
    )
  ) || {}) as {};

  const cliEsCredentials = pick(
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

  return {
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
};
