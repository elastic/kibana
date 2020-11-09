/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RegistryDataStream } from '../../../types';
import { getRegistryDataStreamAssetBaseName } from './index';

test('getBaseName', () => {
  const dataStream: RegistryDataStream = {
    dataset: 'nginx.access',
    title: 'Nginx Acess Logs',
    release: 'beta',
    type: 'logs',
    ingest_pipeline: 'default',
    package: 'nginx',
    path: 'access',
  };
  const name = getRegistryDataStreamAssetBaseName(dataStream);
  expect(name).toStrictEqual('logs-nginx.access');
});
