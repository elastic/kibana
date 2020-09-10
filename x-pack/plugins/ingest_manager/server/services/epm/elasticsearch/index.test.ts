/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dataset } from '../../../types';
import { getDatasetAssetBaseName } from './index';

test('getBaseName', () => {
  const dataset: Dataset = {
    name: 'nginx.access',
    title: 'Nginx Acess Logs',
    release: 'beta',
    type: 'logs',
    ingest_pipeline: 'default',
    package: 'nginx',
    path: 'access',
  };
  const name = getDatasetAssetBaseName(dataset);
  expect(name).toStrictEqual('logs-nginx.access');
});
