/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AdminSessionRequestError, createAdminSessionRequest } from './admin_session_request';

const respond = (status: number, body: string) =>
  jest.fn().mockResolvedValue(new Response(body, { status }));

describe('createAdminSessionRequest', () => {
  it('sends the session cookie, internal headers, query and API version', async () => {
    const request = respond(200, '{"id":"uiam-1"}');
    const send = createAdminSessionRequest(
      'http://localhost:5620/',
      { Cookie: 'sid=abc' },
      request
    );

    await expect(
      send('/internal/security/service_account', {
        method: 'POST',
        query: { name: 'nightshift' },
        body: '{"name":"nightshift"}',
        version: '1',
      })
    ).resolves.toEqual({ id: 'uiam-1' });

    const [url, init] = request.mock.calls[0];
    expect(String(url)).toBe(
      'http://localhost:5620/internal/security/service_account?name=nightshift'
    );
    expect(init).toMatchObject({
      method: 'POST',
      body: '{"name":"nightshift"}',
      headers: {
        Cookie: 'sid=abc',
        'kbn-xsrf': 'true',
        'x-elastic-internal-origin': 'kibana',
        'elastic-api-version': '1',
      },
    });
  });

  it('carries the status of a failed request, which the setup reads for 404 and 409', async () => {
    const send = createAdminSessionRequest('http://localhost:5620', {}, respond(409, 'exists'));
    await expect(send('internal/x', { method: 'GET' })).rejects.toEqual(
      expect.objectContaining({ name: AdminSessionRequestError.name, status: 409 })
    );
  });

  it('returns undefined for an empty body', async () => {
    const send = createAdminSessionRequest('http://localhost:5620', {}, respond(200, ''));
    await expect(send('/x', { method: 'GET' })).resolves.toBeUndefined();
  });
});
