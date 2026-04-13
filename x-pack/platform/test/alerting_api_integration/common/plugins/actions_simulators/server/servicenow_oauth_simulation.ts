/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
  IRouter,
} from '@kbn/core/server';

let authorizationCodeExchangeSeq = 0;
let refreshTokenExchangeSeq = 0;

type OAuthGrantType = 'authorization_code' | 'refresh_token';

function toOAuthGrantType(value: string | undefined): OAuthGrantType | undefined {
  if (value === 'authorization_code' || value === 'refresh_token') {
    return value;
  }
  return undefined;
}

function getFormFields(body: unknown): Record<string, string> {
  if (Buffer.isBuffer(body)) {
    if (body.length === 0) {
      return {};
    }
    return getFormFields(body.toString('utf8'));
  }
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
      if (typeof value === 'string') {
        out[key] = value;
      } else if (Array.isArray(value) && typeof value[0] === 'string') {
        out[key] = value[0];
      }
    }
    return out;
  }
  if (typeof body === 'string' && body.length > 0) {
    const params = new URLSearchParams(body);
    const out: Record<string, string> = {};
    params.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  return {};
}

export function initPlugin(router: IRouter, path: string) {
  router.post(
    {
      path: `${path}/echo`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
        authc: {
          enabled: false,
          reason:
            'This route simulates an external service endpoint and does not require authentication.',
        },
      },
      validate: {},
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const raw = req.headers.authorization;
      const receivedAuth = Array.isArray(raw) ? raw[0] : raw;
      return jsonResponse(res, 200, { receivedAuth: receivedAuth ?? null });
    }
  );

  router.post(
    {
      path: `${path}/oauth_token.do`,
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
        authc: {
          enabled: false,
          reason:
            'This route simulates an external service endpoint and does not require authentication.',
        },
      },
      validate: {
        body: schema.object({}, { unknowns: 'allow' }),
      },
    },
    async function (
      context: RequestHandlerContext,
      req: KibanaRequest<any, any, any, any>,
      res: KibanaResponseFactory
    ): Promise<IKibanaResponse<any>> {
      const fields = getFormFields(req.body);
      const grantType = toOAuthGrantType(fields.grant_type);

      if (grantType === 'authorization_code') {
        authorizationCodeExchangeSeq += 1;
        const n = authorizationCodeExchangeSeq;
        const shortLived = fields.code === 'fake-auth-code-short-expiry';
        return jsonResponse(res, 200, {
          access_token: `sim-oauth-access-${n}`,
          refresh_token: `sim-oauth-refresh-${n}`,
          expires_in: shortLived ? 1 : 3660,
          token_type: 'Bearer',
        });
      }

      if (grantType === 'refresh_token') {
        if (!fields.refresh_token) {
          return jsonResponse(res, 400, {
            error: 'invalid_request',
            error_description: 'Missing refresh_token',
          });
        }
        refreshTokenExchangeSeq += 1;
        const n = refreshTokenExchangeSeq;
        return jsonResponse(res, 200, {
          access_token: `sim-oauth-access-refreshed-${n}`,
          expires_in: 3660,
          token_type: 'Bearer',
        });
      }

      return jsonResponse(res, 200, {
        access_token: 'tokentokentoken',
        expires_in: 3660,
        token_type: 'Bearer',
      });
    }
  );
}

function jsonResponse(
  res: KibanaResponseFactory,
  code: number,
  object: Record<string, unknown> = {}
) {
  return res.custom<Record<string, unknown>>({ body: object, statusCode: code });
}
