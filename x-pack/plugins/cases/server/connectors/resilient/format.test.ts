/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse } from '../../../common/api';
import { format } from './format';

describe('IBM Resilient formatter', () => {
  const theCase = {
    connector: { fields: { incidentTypes: ['2'], severityCode: '2' } },
  } as CaseResponse;

  it('it formats correctly', async () => {
    const res = await format(theCase, []);
    expect(res).toEqual({ ...theCase.connector.fields });
  });

  it('it formats correctly when fields do not exist ', async () => {
    const invalidFields = { tags: ['a tag'], connector: { fields: null } } as CaseResponse;
    const res = await format(invalidFields, []);
    expect(res).toEqual({ incidentTypes: null, severityCode: null });
  });
});
