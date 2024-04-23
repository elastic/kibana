/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineRequestBasicOptionsSchema } from './request_basic';
import { mockBaseTimelineRequest } from './mocks/base_timeline_request';

describe('timelineRequestBasicOptionsSchema', () => {
  it('should correctly parse the base timeline request object', () => {
    expect(timelineRequestBasicOptionsSchema.parse(mockBaseTimelineRequest)).toEqual(
      mockBaseTimelineRequest
    );
  });

  it('should correctly parse the base timeline request object and remove unknown fields', () => {
    const invalidBaseTimelineRequest = {
      ...mockBaseTimelineRequest,
      iAmNotAllowed: 'butWhy?',
    };
    expect(timelineRequestBasicOptionsSchema.parse(invalidBaseTimelineRequest)).toEqual(
      mockBaseTimelineRequest
    );
  });

  it('should correctly error if an incorrect field type is provided for a schema key', () => {
    const invalidBaseTimelineRequest = {
      ...mockBaseTimelineRequest,
      entityType: 'notAValidEntityType',
    };

    expect(() => {
      timelineRequestBasicOptionsSchema.parse(invalidBaseTimelineRequest);
    }).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"received\\": \\"notAValidEntityType\\",
          \\"code\\": \\"invalid_enum_value\\",
          \\"options\\": [
            \\"events\\",
            \\"sessions\\"
          ],
          \\"path\\": [
            \\"entityType\\"
          ],
          \\"message\\": \\"Invalid enum value. Expected 'events' | 'sessions', received 'notAValidEntityType'\\"
        }
      ]"
    `);
  });
});
