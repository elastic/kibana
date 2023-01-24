/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  parseDefaultIngestPipeline,
  parseDataStreamElasticsearchEntry,
  parseTopLevelElasticsearchEntry,
} from './parse';
describe('parseDefaultIngestPipeline', () => {
  it('Should return undefined for stream without any elasticsearch dir', () => {
    expect(
      parseDefaultIngestPipeline('pkg-1.0.0/data_stream/stream1/', [
        'pkg-1.0.0/data_stream/stream1/manifest.yml',
      ])
    ).toEqual(undefined);
  });
  it('Should return undefined for stream with non default ingest pipeline', () => {
    expect(
      parseDefaultIngestPipeline('pkg-1.0.0/data_stream/stream1/', [
        'pkg-1.0.0/data_stream/stream1/manifest.yml',
        'pkg-1.0.0/data_stream/stream1/elasticsearch/ingest_pipeline/someotherpipeline.yml',
      ])
    ).toEqual(undefined);
  });
  it('Should return default for yml ingest pipeline', () => {
    expect(
      parseDefaultIngestPipeline('pkg-1.0.0/data_stream/stream1/', [
        'pkg-1.0.0/data_stream/stream1/manifest.yml',
        'pkg-1.0.0/data_stream/stream1/elasticsearch/ingest_pipeline/default.yml',
      ])
    ).toEqual('default');
  });
  it('Should return default for json ingest pipeline', () => {
    expect(
      parseDefaultIngestPipeline('pkg-1.0.0/data_stream/stream1/', [
        'pkg-1.0.0/data_stream/stream1/manifest.yml',
        'pkg-1.0.0/data_stream/stream1/elasticsearch/ingest_pipeline/default.json',
      ])
    ).toEqual('default');
  });
});

describe('parseDataStreamElasticsearchEntry', () => {
  it('Should handle undefined elasticsearch', () => {
    expect(parseDataStreamElasticsearchEntry()).toEqual({});
  });
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
  it('Should add source_mode', () => {
    expect(parseDataStreamElasticsearchEntry({ source_mode: 'default' })).toEqual({
      source_mode: 'default',
    });
    expect(parseDataStreamElasticsearchEntry({ source_mode: 'synthetic' })).toEqual({
      source_mode: 'synthetic',
    });
  });
  it('Should add index_mode', () => {
    expect(parseDataStreamElasticsearchEntry({ index_mode: 'time_series' })).toEqual({
      index_mode: 'time_series',
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
  it('Should handle dotted values for mappings and settings', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        'index_template.mappings': { dynamic: false },
        'index_template.settings': { 'index.lifecycle.name': 'reference' },
      })
    ).toEqual({
      'index_template.mappings': { dynamic: false },
      'index_template.settings': { 'index.lifecycle.name': 'reference' },
    });
  });
  it('Should handle non-dotted values for privileges', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        privileges: {
          indices: ['read'],
          cluster: ['test'],
        },
      })
    ).toEqual({
      privileges: {
        indices: ['read'],
        cluster: ['test'],
      },
    });
  });
  it('Should handle dotted values for privileges', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        'privileges.indices': ['read'],
        'privileges.cluster': ['test'],
      })
    ).toEqual({
      privileges: {
        indices: ['read'],
        cluster: ['test'],
      },
    });
  });
});

describe('parseTopLevelElasticsearchEntry', () => {
  it('Should handle undefined elasticsearch', () => {
    expect(parseTopLevelElasticsearchEntry()).toEqual({});
  });
  it('Should handle empty elasticsearch', () => {
    expect(parseTopLevelElasticsearchEntry({})).toEqual({});
  });
  it('Should not include junk keys', () => {
    expect(parseTopLevelElasticsearchEntry({ a: 1, b: 2 })).toEqual({});
  });
  it('Should add privileges', () => {
    expect(
      parseTopLevelElasticsearchEntry({ privileges: { index: ['priv1'], cluster: ['priv2'] } })
    ).toEqual({ privileges: { index: ['priv1'], cluster: ['priv2'] } });
  });
  it('Should add index_template mappings and expand dots', () => {
    expect(
      parseTopLevelElasticsearchEntry({
        index_template: { mappings: { dynamic: false, something: { 'dot.somethingelse': 'val' } } },
      })
    ).toEqual({
      'index_template.mappings': { dynamic: false, something: { dot: { somethingelse: 'val' } } },
    });
  });
  it('Should add index_template settings and expand dots', () => {
    expect(
      parseTopLevelElasticsearchEntry({
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
  it('Should handle dotted values for mappings and settings', () => {
    expect(
      parseTopLevelElasticsearchEntry({
        'index_template.mappings': { dynamic: false },
        'index_template.settings': { 'index.lifecycle.name': 'reference' },
      })
    ).toEqual({
      'index_template.mappings': { dynamic: false },
      'index_template.settings': { 'index.lifecycle.name': 'reference' },
    });
  });
  it('Should handle non-dotted values for privileges', () => {
    expect(
      parseTopLevelElasticsearchEntry({
        privileges: {
          indices: ['read'],
          cluster: ['test'],
        },
      })
    ).toEqual({
      privileges: {
        indices: ['read'],
        cluster: ['test'],
      },
    });
  });
  it('Should handle dotted values for privileges', () => {
    expect(
      parseTopLevelElasticsearchEntry({
        'privileges.indices': ['read'],
        'privileges.cluster': ['test'],
      })
    ).toEqual({
      privileges: {
        indices: ['read'],
        cluster: ['test'],
      },
    });
  });
});
