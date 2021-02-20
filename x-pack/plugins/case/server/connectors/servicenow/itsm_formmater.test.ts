/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse } from '../../../common/api';
import { serviceNowITSMExternalServiceFormatter } from './itsm_formatter';

describe('ITSM formatter', () => {
  const theCase = {
    connector: {
      fields: { severity: '2', urgency: '2', impact: '2', category: 'software', subcategory: 'os' },
    },
  } as CaseResponse;

  it('it formats correctly', async () => {
    const res = await serviceNowITSMExternalServiceFormatter.format(theCase, []);
    expect(res).toEqual(theCase.connector.fields);
  });

  it('it formats correctly when fields do not exist ', async () => {
    const invalidFields = { connector: { fields: null } } as CaseResponse;
    const res = await serviceNowITSMExternalServiceFormatter.format(invalidFields, []);
    expect(res).toEqual({
      severity: null,
      urgency: null,
      impact: null,
      category: null,
      subcategory: null,
    });
  });
});
