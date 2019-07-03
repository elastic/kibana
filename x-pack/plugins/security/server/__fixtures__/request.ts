/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { schema } from '@kbn/config-schema';
import { KibanaRequest } from '../../../../../src/core/server';

interface RequestFixtureOptions {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  path?: string;
  search?: string;
  payload?: unknown;
}

export function requestFixture({
  headers = { accept: 'something/html' },
  params,
  path = '/wat',
  search = '',
  payload,
}: RequestFixtureOptions = {}) {
  return KibanaRequest.from(
    {
      headers,
      params,
      url: { path, search },
      query: search ? url.parse(search, true /* parseQueryString */).query : {},
      payload,
      route: { settings: {} },
    } as any,
    { query: schema.object({}, { allowUnknowns: true }) }
  );
}
