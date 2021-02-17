/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestEvent } from '@elastic/elasticsearch/lib/Transport';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ScopedClusterClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { getDeprecatedApmIndices, isLegacyApmIndex } from './index';

describe('getDeprecatedApmIndices', () => {
  let clusterClient: ScopedClusterClientMock;

  const asApiResponse = <T>(body: T): RequestEvent<T> =>
    ({
      body,
    } as RequestEvent<T>);

  beforeEach(() => {
    clusterClient = elasticsearchServiceMock.createScopedClusterClient();

    clusterClient.asCurrentUser.indices.getMapping.mockResolvedValueOnce(
      asApiResponse({
        'foo-1': {
          mappings: {},
        },
        'foo-2': {
          mappings: {
            _meta: {
              version: '6.7.0',
            },
          },
        },
        'foo-3': {
          mappings: {
            _meta: {
              version: '7.0.0',
            },
          },
        },
        'foo-4': {
          mappings: {
            _meta: {
              version: '7.1.0',
            },
          },
        },
      })
    );
  });

  it('calls indices.getMapping', async () => {
    await getDeprecatedApmIndices(clusterClient, ['foo-*', 'bar-*']);

    expect(clusterClient.asCurrentUser.indices.getMapping).toHaveBeenCalledWith({
      index: 'foo-*,bar-*',
      filter_path: '*.mappings._meta.version,*.mappings.properties.@timestamp',
    });
  });

  it('includes mappings not yet at 7.0.0', async () => {
    const deprecations = await getDeprecatedApmIndices(clusterClient, ['foo-*']);

    expect(deprecations).toHaveLength(2);
    expect(deprecations[0].index).toEqual('foo-1');
    expect(deprecations[1].index).toEqual('foo-2');
  });

  it('formats the deprecations', async () => {
    // @ts-ignore
    const [deprecation, _] = await getDeprecatedApmIndices(clusterClient, ['foo-*']);

    expect(deprecation.level).toEqual('warning');
    expect(deprecation.message).toEqual('APM index requires conversion to 7.x format');
    expect(deprecation.url).toEqual(
      'https://www.elastic.co/guide/en/apm/get-started/master/apm-release-notes.html'
    );
    expect(deprecation.details).toEqual('This index was created prior to 7.0');
    expect(deprecation.reindex).toBe(true);
  });
});

describe('isLegacyApmIndex', () => {
  it('is true when for no version', () => {
    expect(isLegacyApmIndex('foo-1', ['foo-*'], {})).toEqual(true);
  });

  it('is true when version is less than 7.0.0', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '6.7.0' },
      })
    ).toEqual(true);
  });

  it('is false when version is 7.0.0', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '7.0.0' },
      })
    ).toEqual(false);
  });

  it('is false when version is greater than 7.0.0', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '7.1.0' },
      })
    ).toEqual(false);
  });

  it('is false when using a version qualifier', () => {
    expect(
      isLegacyApmIndex('foo-1', ['foo-*'], {
        _meta: { version: '7.0.0-rc1' },
      })
    ).toEqual(false);
  });

  it('handles multiple index patterns', () => {
    expect(
      isLegacyApmIndex('bar-1', ['foo-*', 'bar-*'], {
        _meta: { version: '6.7.0' },
      })
    ).toEqual(true);

    expect(
      isLegacyApmIndex('bar-1', ['foo-*', 'bar-*'], {
        _meta: { version: '7.0.0' },
      })
    ).toEqual(false);
  });
});
