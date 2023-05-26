/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ResilientFieldsRT } from './resilient';

describe('ResilientFieldsRT', () => {
  const defaultRequest = {
    severityCode: '6',
    incidentTypes: ['19'],
  };

  it('has expected attributes in request', () => {
    const query = ResilientFieldsRT.decode(defaultRequest);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = ResilientFieldsRT.decode({
      ...defaultRequest,
      foo: 'bar',
    });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultRequest,
    });
  });
});
