/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKbResource } from './get_kb_resource';

describe('getKbResource', () => {
  it('returns undefined when the request is undefined', () => {
    const result = getKbResource(undefined);

    expect(result).toBeUndefined();
  });

  it('returns undefined when params is undefined', () => {
    const request = { params: undefined };

    const result = getKbResource(request);

    expect(result).toBeUndefined();
  });

  it('returns undefined when resource is undefined', () => {
    const request = { params: { resource: undefined } };

    const result = getKbResource(request);

    expect(result).toBeUndefined();
  });

  it('returns the decoded resource', () => {
    const request = { params: { resource: 'esql%20query' } };

    const result = getKbResource(request);

    expect(result).toEqual('esql query');
  });
});
