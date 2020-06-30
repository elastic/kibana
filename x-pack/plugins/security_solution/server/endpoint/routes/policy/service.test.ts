/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetPolicyResponseSchema } from '../../../../common/endpoint/schema/policy';

describe('test policy handlers schema', () => {
  it('validate that get policy response query schema', async () => {
    expect(
      GetPolicyResponseSchema.query.validate({
        hostId: 'id',
      })
    ).toBeTruthy();

    expect(() => GetPolicyResponseSchema.query.validate({})).toThrowError();
  });
});
