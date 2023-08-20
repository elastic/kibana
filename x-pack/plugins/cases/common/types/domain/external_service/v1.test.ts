/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExternalServiceRt } from './v1';

describe('ExternalServiceRt', () => {
  const defaultRequest = {
    connector_id: 'servicenow-1',
    connector_name: 'My SN connector',
    external_id: 'external_id',
    external_title: 'external title',
    external_url: 'basicPush.com',
    pushed_at: '2023-01-17T09:46:29.813Z',
    pushed_by: {
      full_name: 'Leslie Knope',
      username: 'lknope',
      email: 'leslie.knope@elastic.co',
    },
  };
  it('has expected attributes in request', () => {
    const query = ExternalServiceRt.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = ExternalServiceRt.decode({ ...defaultRequest, foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from pushed_by', () => {
    const query = ExternalServiceRt.decode({
      ...defaultRequest,
      pushed_by: { ...defaultRequest.pushed_by, foo: 'bar' },
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });
});
