/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Case } from '../../../common/types/domain';
import { format } from './format';

describe('TheHive formatter', () => {
  const theCase = {
    tags: ['tag1'],
    severity: 'high',
    connector: { fields: { tlp: 1 } },
  } as Case;

  it('it formats correctly', async () => {
    const res = await format(theCase, []);
    expect(res).toEqual({ tlp: 1, tags: ['tag1'], severity: 3 });
  });

  it('it formats correctly when fields do not exist ', async () => {
    const invalidFields = { tags: ['tag1'], severity: 'low', connector: { fields: null } } as Case;
    const res = await format(invalidFields, []);
    expect(res).toEqual({ tlp: null, severity: 1, tags: ['tag1'] });
  });
});
