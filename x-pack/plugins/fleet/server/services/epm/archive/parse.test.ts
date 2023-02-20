/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ArchivePackage } from '../../../../common/types';
import { PackageInvalidArchiveError } from '../../../errors';

import {
  parseDefaultIngestPipeline,
  parseDataStreamElasticsearchEntry,
  parseTopLevelElasticsearchEntry,
  _generatePackageInfoFromPaths,
  parseAndVerifyArchive,
  parseAndVerifyDataStreams,
  parseAndVerifyStreams,
  parseAndVerifyVars,
  parseAndVerifyPolicyTemplates,
  parseAndVerifyInputs,
  parseAndVerifyReadme,
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
  it('Should handle dotted values for data_stream', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        'index_template.data_stream': { hidden: true },
      })
    ).toEqual({
      'index_template.data_stream': { hidden: true },
    });
    expect(
      parseDataStreamElasticsearchEntry({
        'index_template.data_stream': { hidden: false },
      })
    ).toEqual({
      'index_template.data_stream': { hidden: false },
    });
  });
  it('Should handle non-dotted values for data_stream', () => {
    expect(
      parseDataStreamElasticsearchEntry({
        index_template: {
          data_stream: { hidden: true },
        },
      })
    ).toEqual({
      'index_template.data_stream': { hidden: true },
    });
    expect(
      parseDataStreamElasticsearchEntry({
        index_template: {
          data_stream: { hidden: false },
        },
      })
    ).toEqual({
      'index_template.data_stream': { hidden: false },
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

describe('parseAndVerifyArchive', () => {
  it('should parse package successfully', async () => {
    const packageInfo: ArchivePackage = await _generatePackageInfoFromPaths(
      [
        'x-pack/test/fleet_api_integration/apis/fixtures/package_verification/packages/src/input_only-0.1.0/docs/README.md',
        'x-pack/test/fleet_api_integration/apis/fixtures/package_verification/packages/src/input_only-0.1.0/manifest.yml',
      ],
      'x-pack/test/fleet_api_integration/apis/fixtures/package_verification/packages/src/input_only-0.1.0'
    );

    expect(packageInfo).toEqual({
      categories: ['custom'],
      description: 'Read lines from active log files with Elastic Agent.',
      format_version: '1.0.0',
      icons: [
        {
          src: '/img/sample-logo.svg',
          type: 'image/svg+xml',
        },
      ],
      license: 'basic',
      name: 'input_only',
      owner: {
        github: 'elastic/integrations',
      },
      policy_templates: [
        {
          description: 'Collect your custom log files.',
          input: 'logfile',
          multiple: true,
          name: 'first_policy_template',
          template_path: 'input.yml.hbs',
          title: 'Custom log file',
          type: 'logs',
          vars: [
            {
              multi: true,
              name: 'paths',
              required: true,
              show_user: true,
              title: 'Paths',
              type: 'text',
            },
            {
              multi: true,
              name: 'tags',
              required: true,
              show_user: false,
              title: 'Tags',
              type: 'text',
            },
            {
              default: '72h',
              name: 'ignore_older',
              required: false,
              title: 'Ignore events older than',
              type: 'text',
            },
          ],
        },
      ],
      release: 'beta',
      screenshots: [
        {
          size: '600x600',
          src: '/img/sample-screenshot.png',
          title: 'Sample screenshot',
          type: 'image/png',
        },
      ],
      title: 'Custom Logs',
      type: 'input',
      version: '0.1.0',
    });
  });

  it('should throw on more than one top level dirs', () => {
    expect(() =>
      parseAndVerifyArchive(['input_only-0.1.0/manifest.yml', 'dummy/manifest.yml'], {})
    ).toThrowError(
      new PackageInvalidArchiveError('Package contains more than one top-level directory.')
    );
  });

  it('should throw on missing manifest file', () => {
    expect(() => parseAndVerifyArchive(['input_only-0.1.0/test/manifest.yml'], {})).toThrowError(
      new PackageInvalidArchiveError('Package must contain a top-level manifest.yml file.')
    );
  });

  it('should throw on invalid yml in manifest file', () => {
    const buf = Buffer.alloc(1);

    expect(() =>
      parseAndVerifyArchive(['input_only-0.1.0/manifest.yml'], {
        'input_only-0.1.0/manifest.yml': buf,
      })
    ).toThrowError('Could not parse top-level package manifest: YAMLException');
  });

  it('should throw on missing required fields', () => {
    const buf = Buffer.from(
      `
format_version: 1.0.0
name: input_only
title: Custom Logs
description: >-
  Read lines from active log files with Elastic Agent.
version: 0.1.0
    `,
      'utf8'
    );

    expect(() =>
      parseAndVerifyArchive(['input_only-0.1.0/manifest.yml'], {
        'input_only-0.1.0/manifest.yml': buf,
      })
    ).toThrowError('Invalid top-level package manifest: one or more fields missing of ');
  });

  it('should throw on name or version mismatch', () => {
    const buf = Buffer.from(
      `
format_version: 1.0.0
name: input_only
title: Custom Logs
description: >-
  Read lines from active log files with Elastic Agent.
version: 0.2.0
owner:
  github: elastic/integrations
    `,
      'utf8'
    );

    expect(() =>
      parseAndVerifyArchive(['input_only-0.1.0/manifest.yml'], {
        'input_only-0.1.0/manifest.yml': buf,
      })
    ).toThrowError(
      'Name input_only and version 0.2.0 do not match top-level directory input_only-0.1.0'
    );
  });
});

describe('parseAndVerifyDataStreams', () => {
  it('should throw when data stream manifest file missing', async () => {
    expect(() =>
      parseAndVerifyDataStreams({
        paths: ['input-only-0.1.0/data_stream/stream1/README.md'],
        pkgName: 'input-only',
        pkgVersion: '0.1.0',
        manifests: {},
      })
    ).toThrowError("No manifest.yml file found for data stream 'stream1'");
  });

  it('should throw when data stream manifest has invalid yaml', async () => {
    expect(() =>
      parseAndVerifyDataStreams({
        paths: ['input-only-0.1.0/data_stream/stream1/manifest.yml'],
        pkgName: 'input-only',
        pkgVersion: '0.1.0',
        manifests: {
          'input-only-0.1.0/data_stream/stream1/manifest.yml': Buffer.alloc(1),
        },
      })
    ).toThrowError("Could not parse package manifest for data stream 'stream1': YAMLException");
  });

  it('should throw when data stream manifest missing type', async () => {
    expect(() =>
      parseAndVerifyDataStreams({
        paths: ['input-only-0.1.0/data_stream/stream1/manifest.yml'],
        pkgName: 'input-only',
        pkgVersion: '0.1.0',
        manifests: {
          'input-only-0.1.0/data_stream/stream1/manifest.yml': Buffer.from(
            `
          title: Custom Logs`,
            'utf8'
          ),
        },
      })
    ).toThrowError(
      "Invalid manifest for data stream 'stream1': one or more fields missing of 'title', 'type'"
    );
  });

  it('should parse valid data stream', async () => {
    expect(
      parseAndVerifyDataStreams({
        paths: ['input-only-0.1.0/data_stream/stream1/manifest.yml'],
        pkgName: 'input-only',
        pkgVersion: '0.1.0',
        manifests: {
          'input-only-0.1.0/data_stream/stream1/manifest.yml': Buffer.from(
            `
          title: Custom Logs
          type: logs
          dataset: ds
          version: 0.1.0`,
            'utf8'
          ),
        },
      })
    ).toEqual([
      {
        dataset: 'ds',
        elasticsearch: {},
        package: 'input-only',
        path: 'stream1',
        release: 'ga',
        title: 'Custom Logs',
        type: 'logs',
      },
    ]);
  });
});

describe('parseAndVerifyStreams', () => {
  it('should throw when stream manifest missing input', async () => {
    expect(() =>
      parseAndVerifyStreams(
        [
          {
            title: 'stream',
          },
        ],
        'input-only-0.1.0/data_stream/stream1'
      )
    ).toThrowError(
      'Invalid manifest for data stream input-only-0.1.0/data_stream/stream1: stream is missing one or more fields of: input, title'
    );
  });

  it('should parse a valid stream', async () => {
    expect(
      parseAndVerifyStreams(
        [
          {
            title: 'stream',
            input: 'logs',
            description: 'desc',
            vars: [
              {
                name: 'var1',
                type: 'string',
              },
            ],
          },
        ],
        'input-only-0.1.0/data_stream/stream1'
      )
    ).toEqual([
      {
        title: 'stream',
        input: 'logs',
        description: 'desc',
        template_path: 'stream.yml.hbs',
        vars: [
          {
            name: 'var1',
            type: 'string',
          },
        ],
      },
    ]);
  });
});

describe('parseAndVerifyVars', () => {
  it('should throw when invalid var definition', () => {
    expect(() =>
      parseAndVerifyVars(
        [
          {
            name: 'var1',
          },
        ],
        'input-only-0.1.0/data_stream/stream1/var1'
      )
    ).toThrowError(
      'Invalid var definition for input-only-0.1.0/data_stream/stream1/var1: one of mandatory fields \'name\' and \'type\' missing in var: {"name":"var1"}'
    );
  });

  it('should parse valid vars', () => {
    expect(
      parseAndVerifyVars(
        [
          {
            name: 'var1',
            type: 'string',
            title: 'Var',
          },
        ],
        'input-only-0.1.0/data_stream/stream1/var1'
      )
    ).toEqual([
      {
        name: 'var1',
        type: 'string',
        title: 'Var',
      },
    ]);
  });
});

describe('parseAndVerifyPolicyTemplates', () => {
  it('should throw when missing mandatory fields', () => {
    expect(() =>
      parseAndVerifyPolicyTemplates({
        policy_templates: [
          {
            name: 'template1',
            title: 'Template',
          },
        ],
      } as any)
    ).toThrowError(
      'Invalid top-level manifest: one of mandatory fields \'name\', \'title\', \'description\' is missing in policy template: {"name":"template1","title":"Template"}'
    );
  });
});

describe('parseAndVerifyInputs', () => {
  it('should throw when missing mandatory fields', () => {
    expect(() =>
      parseAndVerifyInputs(
        [
          {
            type: 'logs',
          },
        ],
        ''
      )
    ).toThrowError(
      'Invalid top-level manifest: one of mandatory fields \'type\', \'title\' missing in input: {"type":"logs"}'
    );
  });

  it('should return valid input', () => {
    expect(
      parseAndVerifyInputs(
        [
          {
            type: 'logs',
            title: 'title',
            vars: [
              {
                name: 'var1',
                type: 'string',
              },
            ],
          },
        ],
        ''
      )
    ).toEqual([{ title: 'title', type: 'logs', vars: [{ name: 'var1', type: 'string' }] }]);
  });
});

describe('parseAndVerifyReadme', () => {
  it('should return readme path', () => {
    expect(
      parseAndVerifyReadme(['input-only-0.1.0/docs/README.md'], 'input-only', '0.1.0')
    ).toEqual('/package/input-only/0.1.0/docs/README.md');
  });
});
