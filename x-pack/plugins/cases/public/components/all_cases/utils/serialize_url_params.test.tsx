/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeUrlParams } from './serialize_url_params';

describe('serializeUrlParams', () => {
  const commonProps = {
    page: '1',
    perPage: '5',
    sortField: 'createdAt',
    sortOrder: 'desc',
  };

  it('empty severity and status', () => {
    const urlParams = {
      ...commonProps,
      status: [],
      severity: [],
    };

    expect(serializeUrlParams(urlParams).toString()).toEqual(
      'page=1&perPage=5&sortField=createdAt&sortOrder=desc&status=&severity='
    );
  });

  it('severity and status with one value', () => {
    const urlParams = {
      ...commonProps,
      status: ['open'],
      severity: ['low'],
    };

    expect(serializeUrlParams(urlParams).toString()).toEqual(
      'page=1&perPage=5&sortField=createdAt&sortOrder=desc&status=open&severity=low'
    );
  });

  it('severity and status with multiple values', () => {
    const urlParams = {
      ...commonProps,
      status: ['open', 'closed'],
      severity: ['low', 'high'],
    };

    expect(serializeUrlParams(urlParams).toString()).toEqual(
      'page=1&perPage=5&sortField=createdAt&sortOrder=desc&status=open&status=closed&severity=low&severity=high'
    );
  });

  it('severity and status are undefined', () => {
    const urlParams = {
      ...commonProps,
      status: undefined,
      severity: undefined,
    };

    expect(serializeUrlParams(urlParams).toString()).toEqual(
      'page=1&perPage=5&sortField=createdAt&sortOrder=desc'
    );
  });

  it('severity and status are undefined but there are more filters to serialize', () => {
    const urlParams = {
      status: undefined,
      severity: undefined,
      ...commonProps,
    };

    expect(serializeUrlParams(urlParams).toString()).toEqual(
      'page=1&perPage=5&sortField=createdAt&sortOrder=desc'
    );
  });
});
