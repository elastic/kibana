/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { parseDefaultIngestPipeline, parseDataStreamElasticsearchEntry } from './parse';
describe('parseDefaultIngestPipeline', () => {
  it('Should return undefined for stream without any elasticsearch dir', () => {
    expect(
      parseDefaultIngestPipeline({
        pkgKey: 'pkg-1.0.0',
        paths: ['pkg-1.0.0/data_stream/stream1/manifest.yml'],
        dataStreamPath: 'stream1',
      })
    ).toEqual(undefined);
  });
  it('Should return undefined for stream with non default ingest pipeline', () => {
    expect(
      parseDefaultIngestPipeline({
        pkgKey: 'pkg-1.0.0',
        paths: [
          'pkg-1.0.0/data_stream/stream1/manifest.yml',
          'pkg-1.0.0/data_stream/stream1/elasticsearch/ingest_pipeline/someotherpipeline.yml',
        ],
        dataStreamPath: 'stream1',
      })
    ).toEqual(undefined);
  });
  it('Should return default for yml ingest pipeline', () => {
    expect(
      parseDefaultIngestPipeline({
        pkgKey: 'pkg-1.0.0',
        paths: [
          'pkg-1.0.0/data_stream/stream1/manifest.yml',
          'pkg-1.0.0/data_stream/stream1/elasticsearch/ingest_pipeline/default.yml',
        ],
        dataStreamPath: 'stream1',
      })
    ).toEqual('default');
  });
  it('Should return default for json ingest pipeline', () => {
    expect(
      parseDefaultIngestPipeline({
        pkgKey: 'pkg-1.0.0',
        paths: [
          'pkg-1.0.0/data_stream/stream1/manifest.yml',
          'pkg-1.0.0/data_stream/stream1/elasticsearch/ingest_pipeline/default.json',
        ],
        dataStreamPath: 'stream1',
      })
    ).toEqual('default');
  });
});

describe('parseDataStreamElasticsearchEntry', () => {
  it('Should handle empty elasticsearch', () => {
    expect(parseDataStreamElasticsearchEntry({})).toEqual({});
  });
  it('Should not include junk keys', () => {
    expect(parseDataStreamElasticsearchEntry({ a: 1, b: 2 })).toEqual({});
  });
  it('Should add index pipeline', () => {
    expect(parseDataStreamElasticsearchEntry({}, 'default')).toEqual({
      'ingest_pipeline.name': 'default',
    });
  });
  it('Should add privileges', () => {
    expect(
      parseDataStreamElasticsearchEntry({ privileges: { index: ['priv1'], cluster: ['priv2'] } })
    ).toEqual({ privileges: { index: ['priv1'], cluster: ['priv2'] } });
  });
  it('Should add privileges.indices', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        'privileges.indices': ['index1', 'index2'],
      })
    ).toEqual({ 'privileges.indices': ['index1', 'index2'] });
  });
  it('Should add source_mode', () => {
    expect(parseDataStreamElasticsearchEntry({ source_mode: 'default' })).toEqual({
      source_mode: 'default',
    });
    expect(parseDataStreamElasticsearchEntry({ source_mode: 'synthetic' })).toEqual({
      source_mode: 'synthetic',
    });
  });
  it('Should add index_template mappings and expand dots', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        index_template: { mappings: { dynamic: false, something: { 'dot.somethingelse': 'val' } } },
      })
    ).toEqual({
      'index_template.mappings': { dynamic: false, something: { dot: { somethingelse: 'val' } } },
    });
  });
  it('Should add index_template settings and expand dots', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        index_template: {
          settings: {
            index: {
              codec: 'best_compression',
              'sort.field': 'monitor.id',
            },
          },
        },
      })
    ).toEqual({
      'index_template.settings': {
        index: {
          codec: 'best_compression',
          sort: { field: 'monitor.id' },
        },
      },
    });
  });
});
