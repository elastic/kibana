/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetPolicyResponseSchema } from '../../../../common/api/endpoint';
import { getESQueryPolicyResponseByAgentID } from './service';

describe('test policy handlers schema', () => {
  it('validate that get policy response query schema', async () => {
    expect(
      GetPolicyResponseSchema.query.validate({
        agentId: 'id',
      })
    ).toBeTruthy();

    expect(() => GetPolicyResponseSchema.query.validate({})).toThrowError();
  });
});

describe('test policy query', () => {
  it('queries for the correct host', async () => {
    const agentId = 'f757d3c0-e874-11ea-9ad9-015510b487f4';
    const query = getESQueryPolicyResponseByAgentID(agentId, 'anyindex');
    expect(query.body?.query?.bool?.filter).toEqual({ term: { 'agent.id': agentId } });
  });

  it('filters out initial policy by ID', async () => {
    const query = getESQueryPolicyResponseByAgentID(
      'f757d3c0-e874-11ea-9ad9-015510b487f4',
      'anyindex'
    );
    expect(query.body?.query?.bool?.must_not).toEqual({
      term: {
        'Endpoint.policy.applied.id': '00000000-0000-0000-0000-000000000000',
      },
    });
  });
});
