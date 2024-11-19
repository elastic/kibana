/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineKpiRequestOptionsSchema } from './kpi';
import { mockBaseTimelineRequest } from './mocks/base_timeline_request';

const mockKpiRequest = {
  ...mockBaseTimelineRequest,
  factoryQueryType: 'eventsKpi',
};

describe('timelineKpiRequestOptionsSchema', () => {
  it('should correctly parse the events kpi request object', () => {
    expect(timelineKpiRequestOptionsSchema.parse(mockKpiRequest)).toEqual(mockKpiRequest);
  });

  it('should correctly parse the events kpi request object and remove unknown fields', () => {
    const invalidKpiRequest = {
      ...mockKpiRequest,
      unknownField: 'shouldBeRemoved',
    };
    expect(timelineKpiRequestOptionsSchema.parse(invalidKpiRequest)).toEqual(mockKpiRequest);
  });

  it('should correctly error if an incorrect field type is provided for a schema key', () => {
    const invalidKpiRequest = {
      ...mockKpiRequest,
      factoryQueryType: 'someOtherType',
    };

    expect(() => {
      timelineKpiRequestOptionsSchema.parse(invalidKpiRequest);
    }).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"received\\": \\"someOtherType\\",
          \\"code\\": \\"invalid_literal\\",
          \\"expected\\": \\"eventsKpi\\",
          \\"path\\": [
            \\"factoryQueryType\\"
          ],
          \\"message\\": \\"Invalid literal value, expected \\\\\\"eventsKpi\\\\\\"\\"
        }
      ]"
    `);
  });
});
