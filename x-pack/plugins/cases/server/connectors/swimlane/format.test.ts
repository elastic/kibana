/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse } from '../../../common/api';
import { format } from './format';

describe('Swimlane formatter', () => {
  const theCase = {
    id: 'case-id',
    connector: { fields: null },
  } as CaseResponse;

  it('it formats correctly', async () => {
    const res = await format(theCase, []);
    expect(res).toEqual({ caseId: theCase.id });
  });
});
