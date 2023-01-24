/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

const responseMock = {
  create: httpServerMock.createResponseFactory,
};

type ResponseMock = ReturnType<typeof responseMock.create>;
type Method = keyof ResponseMock;

type MockCall = any;

interface ResponseCall {
  body: any;
  status: number;
}

/**
 * @internal
 */
export interface Response extends ResponseCall {
  calls: ResponseCall[];
}

const buildResponses = (method: Method, calls: MockCall[]): ResponseCall[] => {
  if (!calls.length) return [];

  switch (method) {
    case 'ok':
      return calls.map(([call]) => ({ status: 200, body: call.body }));
    case 'customError':
      return calls.map(([call]) => ({
        status: call.statusCode,
        body: call.body,
      }));
    default:
      throw new Error(`Encountered unexpected call to response.${method}`);
  }
};

export const responseAdapter = (response: ResponseMock): Response => {
  const methods = Object.keys(response) as Method[];
  const calls = methods
    .reduce<Response['calls']>((responses, method) => {
      const methodMock = response[method];
      return [...responses, ...buildResponses(method, methodMock.mock.calls)];
    }, [])
    .sort((call, other) => other.status - call.status);

  const [{ body, status }] = calls;

  return {
    body,
    status,
    calls,
  };
};
