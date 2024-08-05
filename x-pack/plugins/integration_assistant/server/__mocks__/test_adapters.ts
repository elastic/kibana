/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { responseMock } from './response';

type ResponseMock = ReturnType<typeof responseMock.create>;
type Method = keyof ResponseMock;

type MockCall = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface ResponseCall {
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    case 'custom':
      return calls.map(([call]) => ({
        status: call.statusCode,
        body: JSON.parse(call.body),
      }));
    case 'badRequest':
      return calls.map(([call]) => ({
        status: 400,
        body: call.body,
      }));
    case 'notFound':
      return calls.map(([call]) => ({
        status: 404,
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
