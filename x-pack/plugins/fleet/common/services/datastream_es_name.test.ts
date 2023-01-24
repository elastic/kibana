/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCustomPipelineNameForDatastream,
  getRegistryDataStreamAssetBaseName,
} from './datastream_es_name';

describe('getCustomPipelineNameForDatastream', () => {
  it('return the correct custom pipeline for datastream', () => {
    const res = getCustomPipelineNameForDatastream({
      type: 'logs',
      dataset: 'test',
    } as any);

    expect(res).toBe('logs-test@custom');
  });
});

describe('getRegistryDataStreamAssetBaseName', () => {
  it('return the asset name', () => {
    const dataStream = {
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

  it('return the asset name for hidden index', () => {
    const dataStream = {
      dataset: 'nginx.access',
      title: 'Nginx Acess Logs',
      release: 'beta',
      type: 'logs',
      ingest_pipeline: 'default',
      package: 'nginx',
      path: 'access',
      hidden: true,
    };
    const name = getRegistryDataStreamAssetBaseName(dataStream);
    expect(name).toStrictEqual('.logs-nginx.access');
  });
});
