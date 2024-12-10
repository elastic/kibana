/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCasesClientMock } from '../../../client/mocks';
import { getCaseRoute } from './get_case';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';

describe('getCaseRoute', () => {
  const casesClientMock = createCasesClientMock();
  const logger = loggingSystemMock.createLogger();
  const response = httpServerMock.createResponseFactory();
  const kibanaVersion = '8.17';
  const context = { cases: { getCasesClient: jest.fn().mockResolvedValue(casesClientMock) } };

  it('throws a bad request if the includeComments is set in serverless', async () => {
    const router = getCaseRoute({ isServerless: true });
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/?includeComments=true',
      query: { includeComments: true },
      params: { case_id: 'foo' },
    });

    await expect(
      // @ts-expect-error: no need to create the context
      router.handler({ response, request, logger, kibanaVersion, context })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Failed to retrieve case in route case id: foo 
      include comments: true: Error: includeComments is not supported"
    `);
  });

  it('does not throw a bad request if the includeComments is set in non-serverless', async () => {
    const router = getCaseRoute({ isServerless: false });
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}/?includeComments=true',
      query: { includeComments: true },
      params: { case_id: 'foo' },
    });

    await expect(
      // @ts-expect-error: no need to create the context
      router.handler({ response, request, logger, kibanaVersion, context })
    ).resolves.not.toThrow();
  });

  it('does not throw a bad request if the includeComments is not set in serverless', async () => {
    const router = getCaseRoute({ isServerless: true });
    const request = httpServerMock.createKibanaRequest({
      path: '/api/cases/{case_id}',
      params: { case_id: 'foo' },
    });

    await expect(
      // @ts-expect-error: no need to create the context
      router.handler({ response, request, logger, kibanaVersion, context })
    ).resolves.not.toThrow();
  });
});
