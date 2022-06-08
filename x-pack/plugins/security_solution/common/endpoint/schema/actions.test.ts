/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { EndpointActionListRequestSchema } from './actions';

describe('Endpoint action list API Schema', () => {
  it('should work without any query keys ', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({}); // no agent_ids provided
    }).not.toThrow();
  });

  it('should require at least 1 agent ID', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({ agentIds: [] }); // no agent_ids provided
    }).toThrow();
  });

  it('should not accept an agent ID if not in an array', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({ agentIds: uuid.v4() });
    }).toThrow();
  });

  it('should accept an agent ID in an array', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({ agentIds: [uuid.v4()] });
    }).not.toThrow();
  });

  it('should accept multiple agent IDs in an array', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        agentIds: [uuid.v4(), uuid.v4(), uuid.v4()],
      });
    }).not.toThrow();
  });

  it('should limit multiple agent IDs in an array to 50', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        agentIds: Array(51)
          .fill(1)
          .map(() => uuid.v4()),
      });
    }).toThrow();
  });

  it('should work with all required query params', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
      });
    }).not.toThrow();
  });

  it('should not work without allowed page and pageSize params', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({ pageSize: 101 });
    }).toThrow();
  });

  it('should not work without valid userIds', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
        userIds: [],
      });
    }).toThrow();
  });

  it('should work with a single userIds query params', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
        userIds: ['elastic'],
      });
    }).not.toThrow();
  });

  it('should work with multiple userIds query params', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
        userIds: ['elastic', 'fleet'],
      });
    }).not.toThrow();
  });

  it('should work with commands query params with a single action type', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
        commands: ['isolate'],
      });
    }).not.toThrow();
  });

  it('should not work with commands query params with empty array', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
        commands: [],
      });
    }).toThrow();
  });

  it('should work with commands query params with multiple types', () => {
    expect(() => {
      EndpointActionListRequestSchema.query.validate({
        page: 10,
        pageSize: 100,
        startDate: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(), // yesterday
        endDate: new Date().toISOString(), // today
        commands: ['isolate', 'unisolate'],
      });
    }).not.toThrow();
  });
});
