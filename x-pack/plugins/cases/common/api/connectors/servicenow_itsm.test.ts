/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ServiceNowITSMFieldsRT } from './servicenow_itsm';

describe('ServiceNowITSMFieldsRT', () => {
  const defaultReq = {
    severity: '2',
    urgency: '2',
    impact: '2',
    category: 'software',
    subcategory: 'os',
  };

  it('has expected attributes in request', () => {
    const query = ServiceNowITSMFieldsRT.decode(defaultReq);

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });

  it('removes foo:bar attributes from request', () => {
    const query = ServiceNowITSMFieldsRT.decode({ ...defaultReq, foo: 'bar' });

    expect(query).toStrictEqual({
      _tag: 'Right',
      right: defaultReq,
    });
  });
});
