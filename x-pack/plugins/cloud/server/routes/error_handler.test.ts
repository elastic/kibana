/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, KibanaRequest, RequestHandler } from '@kbn/core-http-server';
import { CustomRequestHandlerContext, kibanaResponseFactory } from '@kbn/core/server';
import { createLicensedRouteHandler } from './error_handler';
import { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

const createHandler =
  (handler: () => any): RequestHandler<any, any, any> =>
  () => {
    return handler();
  };

const mockRouteContext = {
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        state: 'valid',
      }),
    },
  },
} as unknown as CustomRequestHandlerContext<{ licensing: LicensingApiRequestHandlerContext }>;

const mockRouteContextWithInvalidLicense = {
  licensing: {
    license: {
      check: jest.fn().mockReturnValue({
        state: 'invalid',
        message: 'License is invalid for spaces',
      }),
    },
  },
} as unknown as CustomRequestHandlerContext<{ licensing: LicensingApiRequestHandlerContext }>;

describe('wrapErrors', () => {
  let context: CustomRequestHandlerContext<{ licensing: LicensingApiRequestHandlerContext }>;
  let request: KibanaRequest<any, any, any>;
  let response: KibanaResponseFactory;

  beforeEach(() => {
    request = {} as any;
    response = kibanaResponseFactory;
  });

  it('should pass-though call parameters to the handler', async () => {
    context = mockRouteContext;
    const handler = jest.fn();
    const wrapped = createLicensedRouteHandler(handler);
    await wrapped(context, request, response);
    expect(handler).toHaveBeenCalledWith(context, request, response);
  });

  it('should pass-though result from the handler', async () => {
    context = mockRouteContext;
    const handler = createHandler(() => {
      return 'handler-response';
    });
    const wrapped = createLicensedRouteHandler(handler);
    const result = await wrapped(context, request, response);
    expect(result).toBe('handler-response');
  });

  it('should re-throw errors', async () => {
    context = mockRouteContext;
    const handler = createHandler(() => {
      throw new Error('something went bad');
    });
    const wrapped = createLicensedRouteHandler(handler);
    await expect(wrapped(context, request, response)).rejects.toMatchInlineSnapshot(
      `[Error: something went bad]`
    );
  });

  it('should response with a license error', async () => {
    context = mockRouteContextWithInvalidLicense;
    const handler = createHandler(() => {
      throw new Error('something went bad');
    });
    const wrapped = createLicensedRouteHandler(handler);
    await expect(wrapped(context, request, response)).resolves.toMatchInlineSnapshot(`
      KibanaResponse {
        "options": Object {
          "body": Object {
            "message": "License is invalid for spaces",
          },
        },
        "payload": Object {
          "message": "License is invalid for spaces",
        },
        "status": 403,
      }
    `);
  });
});
