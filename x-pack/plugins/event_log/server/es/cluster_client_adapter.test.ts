/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyClusterClient } from 'src/core/server';
import { elasticsearchServiceMock, loggingSystemMock } from 'src/core/server/mocks';
import {
  ClusterClientAdapter,
  IClusterClientAdapter,
  EVENT_BUFFER_LENGTH,
} from './cluster_client_adapter';
import { contextMock } from './context.mock';
import { findOptionsSchema } from '../event_log_client';
import { delay } from '../lib/delay';

type EsClusterClient = Pick<jest.Mocked<LegacyClusterClient>, 'callAsInternalUser' | 'asScoped'>;
type MockedLogger = ReturnType<typeof loggingSystemMock['createLogger']>;

let logger: MockedLogger;
let clusterClient: EsClusterClient;
let clusterClientAdapter: IClusterClientAdapter;

beforeEach(() => {
  logger = loggingSystemMock.createLogger();
  clusterClient = elasticsearchServiceMock.createLegacyClusterClient();
  clusterClientAdapter = new ClusterClientAdapter({
    logger,
    clusterClientPromise: Promise.resolve(clusterClient),
    context: contextMock.create(),
  });
});

describe('indexDocument', () => {
  test('should call cluster client bulk with given doc', async () => {
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.callAsInternalUser.mock.calls.length !== 0;
    });

    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('bulk', {
      body: [{ create: { _index: 'event-log' } }, { message: 'foo' }],
    });
  });

  test('should log an error when cluster client throws an error', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('expected failure'));
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });
    await retryUntil('cluster client bulk called', () => {
      return logger.error.mock.calls.length !== 0;
    });

    const expectedMessage = `error writing bulk events: "expected failure"; docs: [{"create":{"_index":"event-log"}},{"message":"foo"}]`;
    expect(logger.error).toHaveBeenCalledWith(expectedMessage);
  });
});

describe('shutdown()', () => {
  test('should work if no docs have been written', async () => {
    const result = await clusterClientAdapter.shutdown();
    expect(result).toBeFalsy();
  });

  test('should work if some docs have been written', async () => {
    clusterClientAdapter.indexDocument({ body: { message: 'foo' }, index: 'event-log' });
    const resultPromise = clusterClientAdapter.shutdown();

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.callAsInternalUser.mock.calls.length !== 0;
    });

    const result = await resultPromise;
    expect(result).toBeFalsy();
  });
});

describe('buffering documents', () => {
  test('should write buffered docs after timeout', async () => {
    // write EVENT_BUFFER_LENGTH - 1 docs
    for (let i = 0; i < EVENT_BUFFER_LENGTH - 1; i++) {
      clusterClientAdapter.indexDocument({ body: { message: `foo ${i}` }, index: 'event-log' });
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.callAsInternalUser.mock.calls.length !== 0;
    });

    const expectedBody = [];
    for (let i = 0; i < EVENT_BUFFER_LENGTH - 1; i++) {
      expectedBody.push({ create: { _index: 'event-log' } }, { message: `foo ${i}` });
    }

    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('bulk', {
      body: expectedBody,
    });
  });

  test('should write buffered docs after buffer exceeded', async () => {
    // write EVENT_BUFFER_LENGTH + 1 docs
    for (let i = 0; i < EVENT_BUFFER_LENGTH + 1; i++) {
      clusterClientAdapter.indexDocument({ body: { message: `foo ${i}` }, index: 'event-log' });
    }

    await retryUntil('cluster client bulk called', () => {
      return clusterClient.callAsInternalUser.mock.calls.length >= 2;
    });

    const expectedBody = [];
    for (let i = 0; i < EVENT_BUFFER_LENGTH; i++) {
      expectedBody.push({ create: { _index: 'event-log' } }, { message: `foo ${i}` });
    }

    expect(clusterClient.callAsInternalUser).toHaveBeenNthCalledWith(1, 'bulk', {
      body: expectedBody,
    });

    expect(clusterClient.callAsInternalUser).toHaveBeenNthCalledWith(2, 'bulk', {
      body: [{ create: { _index: 'event-log' } }, { message: `foo 100` }],
    });
  });
});

describe('doesIlmPolicyExist', () => {
  // ElasticsearchError can be a bit random in shape, we need an any here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notFoundError = new Error('Not found') as any;
  notFoundError.statusCode = 404;

  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIlmPolicyExist('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('transport.request', {
      method: 'GET',
      path: '/_ilm/policy/foo',
    });
  });

  test('should return false when 404 error is returned by Elasticsearch', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(notFoundError);
    await expect(clusterClientAdapter.doesIlmPolicyExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when error is not 404', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIlmPolicyExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error checking existance of ilm policy: Fail"`);
  });

  test('should return true when no error is thrown', async () => {
    await expect(clusterClientAdapter.doesIlmPolicyExist('foo')).resolves.toEqual(true);
  });
});

describe('createIlmPolicy', () => {
  test('should call cluster client with given policy', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({ success: true });
    await clusterClientAdapter.createIlmPolicy('foo', { args: true });
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('transport.request', {
      method: 'PUT',
      path: '/_ilm/policy/foo',
      body: { args: true },
    });
  });

  test('should throw error when call cluster client throws', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createIlmPolicy('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating ilm policy: Fail"`);
  });
});

describe('doesIndexTemplateExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesIndexTemplateExist('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.existsTemplate', {
      name: 'foo',
    });
  });

  test('should return true when call cluster returns true', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue(true);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue(false);
    await expect(clusterClientAdapter.doesIndexTemplateExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesIndexTemplateExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existance of index template: Fail"`
    );
  });
});

describe('createIndexTemplate', () => {
  test('should call cluster with given template', async () => {
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.putTemplate', {
      name: 'foo',
      create: true,
      body: { args: true },
    });
  });

  test(`should throw error if index template still doesn't exist after error is thrown`, async () => {
    clusterClient.callAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.callAsInternalUser.mockResolvedValueOnce(false);
    await expect(
      clusterClientAdapter.createIndexTemplate('foo', { args: true })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating index template: Fail"`);
  });

  test('should not throw error if index template exists after error is thrown', async () => {
    clusterClient.callAsInternalUser.mockRejectedValueOnce(new Error('Fail'));
    clusterClient.callAsInternalUser.mockResolvedValueOnce(true);
    await clusterClientAdapter.createIndexTemplate('foo', { args: true });
  });
});

describe('doesAliasExist', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.doesAliasExist('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.existsAlias', {
      name: 'foo',
    });
  });

  test('should return true when call cluster returns true', async () => {
    clusterClient.callAsInternalUser.mockResolvedValueOnce(true);
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(true);
  });

  test('should return false when call cluster returns false', async () => {
    clusterClient.callAsInternalUser.mockResolvedValueOnce(false);
    await expect(clusterClientAdapter.doesAliasExist('foo')).resolves.toEqual(false);
  });

  test('should throw error when call cluster throws an error', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.doesAliasExist('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"error checking existance of initial index: Fail"`
    );
  });
});

describe('createIndex', () => {
  test('should call cluster with proper arguments', async () => {
    await clusterClientAdapter.createIndex('foo');
    expect(clusterClient.callAsInternalUser).toHaveBeenCalledWith('indices.create', {
      index: 'foo',
      body: {},
    });
  });

  test('should throw error when not getting an error of type resource_already_exists_exception', async () => {
    clusterClient.callAsInternalUser.mockRejectedValue(new Error('Fail'));
    await expect(
      clusterClientAdapter.createIndex('foo')
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"error creating initial index: Fail"`);
  });

  test(`shouldn't throw when an error of type resource_already_exists_exception is thrown`, async () => {
    // ElasticsearchError can be a bit random in shape, we need an any here
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = new Error('Already exists') as any;
    err.body = {
      error: {
        type: 'resource_already_exists_exception',
      },
    };
    clusterClient.callAsInternalUser.mockRejectedValue(err);
    await clusterClientAdapter.createIndex('foo');
  });
});

describe('queryEventsBySavedObject', () => {
  const DEFAULT_OPTIONS = findOptionsSchema.validate({});

  test('should call cluster with proper arguments with non-default namespace', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });
    await clusterClientAdapter.queryEventsBySavedObject(
      'index-name',
      'namespace',
      'saved-object-type',
      'saved-object-id',
      DEFAULT_OPTIONS
    );

    const [method, query] = clusterClient.callAsInternalUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(query).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "from": 0,
          "query": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "nested": Object {
                    "path": "kibana.saved_objects",
                    "query": Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "kibana.saved_objects.rel": Object {
                                "value": "primary",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.type": Object {
                                "value": "saved-object-type",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.id": Object {
                                "value": "saved-object-id",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.namespace": Object {
                                "value": "namespace",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
          "size": 10,
          "sort": Object {
            "@timestamp": Object {
              "order": "asc",
            },
          },
        },
        "index": "index-name",
        "rest_total_hits_as_int": true,
      }
    `);
  });

  test('should call cluster with proper arguments with default namespace', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });
    await clusterClientAdapter.queryEventsBySavedObject(
      'index-name',
      undefined,
      'saved-object-type',
      'saved-object-id',
      DEFAULT_OPTIONS
    );

    const [method, query] = clusterClient.callAsInternalUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(query).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "from": 0,
          "query": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "nested": Object {
                    "path": "kibana.saved_objects",
                    "query": Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "kibana.saved_objects.rel": Object {
                                "value": "primary",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.type": Object {
                                "value": "saved-object-type",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.id": Object {
                                "value": "saved-object-id",
                              },
                            },
                          },
                          Object {
                            "bool": Object {
                              "must_not": Object {
                                "exists": Object {
                                  "field": "kibana.saved_objects.namespace",
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
          "size": 10,
          "sort": Object {
            "@timestamp": Object {
              "order": "asc",
            },
          },
        },
        "index": "index-name",
        "rest_total_hits_as_int": true,
      }
    `);
  });

  test('should call cluster with sort', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });
    await clusterClientAdapter.queryEventsBySavedObject(
      'index-name',
      'namespace',
      'saved-object-type',
      'saved-object-id',
      { ...DEFAULT_OPTIONS, sort_field: 'event.end', sort_order: 'desc' }
    );

    const [method, query] = clusterClient.callAsInternalUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(query).toMatchObject({
      index: 'index-name',
      body: {
        sort: { 'event.end': { order: 'desc' } },
      },
    });
  });

  test('supports open ended date', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });

    const start = '2020-07-08T00:52:28.350Z';

    await clusterClientAdapter.queryEventsBySavedObject(
      'index-name',
      'namespace',
      'saved-object-type',
      'saved-object-id',
      { ...DEFAULT_OPTIONS, start }
    );

    const [method, query] = clusterClient.callAsInternalUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(query).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "from": 0,
          "query": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "nested": Object {
                    "path": "kibana.saved_objects",
                    "query": Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "kibana.saved_objects.rel": Object {
                                "value": "primary",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.type": Object {
                                "value": "saved-object-type",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.id": Object {
                                "value": "saved-object-id",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.namespace": Object {
                                "value": "namespace",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "2020-07-08T00:52:28.350Z",
                    },
                  },
                },
              ],
            },
          },
          "size": 10,
          "sort": Object {
            "@timestamp": Object {
              "order": "asc",
            },
          },
        },
        "index": "index-name",
        "rest_total_hits_as_int": true,
      }
    `);
  });

  test('supports optional date range', async () => {
    clusterClient.callAsInternalUser.mockResolvedValue({
      hits: {
        hits: [],
        total: { value: 0 },
      },
    });

    const start = '2020-07-08T00:52:28.350Z';
    const end = '2020-07-08T00:00:00.000Z';

    await clusterClientAdapter.queryEventsBySavedObject(
      'index-name',
      'namespace',
      'saved-object-type',
      'saved-object-id',
      { ...DEFAULT_OPTIONS, start, end }
    );

    const [method, query] = clusterClient.callAsInternalUser.mock.calls[0];
    expect(method).toEqual('search');
    expect(query).toMatchInlineSnapshot(`
      Object {
        "body": Object {
          "from": 0,
          "query": Object {
            "bool": Object {
              "must": Array [
                Object {
                  "nested": Object {
                    "path": "kibana.saved_objects",
                    "query": Object {
                      "bool": Object {
                        "must": Array [
                          Object {
                            "term": Object {
                              "kibana.saved_objects.rel": Object {
                                "value": "primary",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.type": Object {
                                "value": "saved-object-type",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.id": Object {
                                "value": "saved-object-id",
                              },
                            },
                          },
                          Object {
                            "term": Object {
                              "kibana.saved_objects.namespace": Object {
                                "value": "namespace",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "gte": "2020-07-08T00:52:28.350Z",
                    },
                  },
                },
                Object {
                  "range": Object {
                    "@timestamp": Object {
                      "lte": "2020-07-08T00:00:00.000Z",
                    },
                  },
                },
              ],
            },
          },
          "size": 10,
          "sort": Object {
            "@timestamp": Object {
              "order": "asc",
            },
          },
        },
        "index": "index-name",
        "rest_total_hits_as_int": true,
      }
    `);
  });
});

type RetryableFunction = () => boolean;

const RETRY_UNTIL_DEFAULT_COUNT = 20;
const RETRY_UNTIL_DEFAULT_WAIT = 1000; // milliseconds

async function retryUntil(
  label: string,
  fn: RetryableFunction,
  count: number = RETRY_UNTIL_DEFAULT_COUNT,
  wait: number = RETRY_UNTIL_DEFAULT_WAIT
): Promise<boolean> {
  while (count > 0) {
    count--;

    if (fn()) return true;

    // eslint-disable-next-line no-console
    console.log(`attempt failed waiting for "${label}", attempts left: ${count}`);

    if (count === 0) return false;
    await delay(wait);
  }

  return false;
}
