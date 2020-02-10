/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contextMock } from './context.mock';
import { initializeEs } from './init';

describe('initializeEs', () => {
  const esContext = contextMock.create();
  const createIndexBody = {
    index: '.kibana-event-log-000001',
  };
  const createIndexTemplateBody = {
    create: true,
    name: '.kibana-event-log-template',
    body: expect.anything(),
  };
  const createIlmRequestBody = {
    method: 'PUT',
    path: '_ilm/policy/.kibana-event-log-policy',
    body: {
      policy: {
        phases: {
          hot: {
            actions: {
              rollover: {
                max_age: '30d',
                max_size: '5GB',
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => jest.resetAllMocks());

  test('should initialize elasticsearch', async () => {
    esContext.callEs.mockImplementation(
      getCallEsImplementation({
        ilmPolicyExists: false,
        indexTemplateExists: false,
        initialIndexExists: false,
      })
    );

    await initializeEs(esContext);
    expect(esContext.callEs).toHaveBeenCalledWith('transport.request', createIlmRequestBody);
    expect(esContext.callEs).toHaveBeenCalledWith('indices.putTemplate', createIndexTemplateBody);
    expect(esContext.callEs).toHaveBeenCalledWith('indices.create', createIndexBody);
  });

  test('should skip initializing ILM policy when it already exists', async () => {
    esContext.callEs.mockImplementation(
      getCallEsImplementation({
        ilmPolicyExists: true,
        indexTemplateExists: false,
        initialIndexExists: false,
      })
    );

    await initializeEs(esContext);
    expect(esContext.callEs).not.toHaveBeenCalledWith('transport.request', createIlmRequestBody);
    expect(esContext.callEs).toHaveBeenCalledWith('indices.putTemplate', createIndexTemplateBody);
    expect(esContext.callEs).toHaveBeenCalledWith('indices.create', createIndexBody);
  });

  test('should skip creating index template when it already exists', async () => {
    esContext.callEs.mockImplementation(
      getCallEsImplementation({
        ilmPolicyExists: false,
        indexTemplateExists: true,
        initialIndexExists: false,
      })
    );

    await initializeEs(esContext);
    expect(esContext.callEs).toHaveBeenCalledWith('transport.request', createIlmRequestBody);
    expect(esContext.callEs).not.toHaveBeenCalledWith(
      'indices.putTemplate',
      createIndexTemplateBody
    );
    expect(esContext.callEs).toHaveBeenCalledWith('indices.create', createIndexBody);
  });

  test('should skip creating initial index when it already exists', async () => {
    esContext.callEs.mockImplementation(
      getCallEsImplementation({
        ilmPolicyExists: false,
        indexTemplateExists: false,
        initialIndexExists: true,
      })
    );

    await initializeEs(esContext);
    expect(esContext.callEs).toHaveBeenCalledWith('transport.request', createIlmRequestBody);
    expect(esContext.callEs).toHaveBeenCalledWith('indices.putTemplate', createIndexTemplateBody);
    expect(esContext.callEs).not.toHaveBeenCalledWith('indices.create', createIndexBody);
  });

  test('should double check if index template exists when error is thrown during creation request', async () => {
    esContext.callEs.mockImplementation(
      getCallEsImplementation({
        ilmPolicyExists: false,
        indexTemplateExists: false,
        initialIndexExists: true,
      })
    );

    await initializeEs(esContext);
    expect(esContext.callEs).toHaveBeenCalledWith('transport.request', createIlmRequestBody);
    expect(esContext.callEs).toHaveBeenCalledWith('indices.putTemplate', createIndexTemplateBody);
    expect(esContext.callEs).not.toHaveBeenCalledWith('indices.create', createIndexBody);
  });
});

function throwNotFoundError() {
  const err = new Error('Not found') as any;
  err.statusCode = 404;
  throw err;
}

function getCallEsImplementation({
  ilmPolicyExists,
  indexTemplateExists,
  initialIndexExists,
}: {
  ilmPolicyExists: boolean;
  indexTemplateExists: boolean;
  initialIndexExists: boolean;
}) {
  return async (operation: string, body?: any) => {
    // Make ILM policy exist check return false
    if (
      operation === 'transport.request' &&
      body?.method === 'GET' &&
      body?.path === '_ilm/policy/.kibana-event-log-policy'
    ) {
      if (!ilmPolicyExists) {
        throwNotFoundError();
      }
      return {};
    }

    // Make index template exists check return false
    if (operation === 'indices.existsTemplate' && body?.name === '.kibana-event-log-template') {
      return indexTemplateExists;
    }

    // Make alias exists check return false
    if (operation === 'indices.existsAlias' && body?.name === '.kibana-event-log') {
      return initialIndexExists;
    }
  };
}
