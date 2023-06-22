/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceNowSIRFieldsRT } from './servicenow_sir';

describe('ServiceNowSIRFieldsRT', () => {
  const defaultReq = {
    destIp: true,
    sourceIp: true,
    malwareHash: true,
    malwareUrl: true,
    priority: '1',
    category: 'Denial of Service',
    subcategory: '26',
  };

  it('has expected attributes in request', () => {
    const query = ServiceNowSIRFieldsRT.decode(defaultReq);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = ServiceNowSIRFieldsRT.decode({ ...defaultReq, foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });
});
