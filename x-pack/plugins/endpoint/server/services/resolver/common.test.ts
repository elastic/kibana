/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { parseLegacyEntityID, isLegacyEntityID, buildLegacyEntityID } from './common';

describe('legacy entity identification and parsing', () => {
  it('throws an error for an id without 3 parts', () => {
    expect(() => {
      parseLegacyEntityID('endgame|blah');
    }).toThrow();
  });

  it('parses a legacy entity ID correctly', () => {
    expect(parseLegacyEntityID('endgame|endpoint|pid')).toStrictEqual({
      endpointID: 'endpoint',
      uniquePID: 'pid',
    });
  });

  it('identifies a legacy entity ID correctly', () => {
    expect(isLegacyEntityID('endgame|some-endpoint-id|12456')).toBeTruthy();
  });

  it('builds an legacy entity ID correctly', () => {
    const entityID = buildLegacyEntityID('endpoint', 500);
    expect(isLegacyEntityID(entityID)).toBeTruthy();
    expect(parseLegacyEntityID(entityID)).toStrictEqual({
      endpointID: 'endpoint',
      uniquePID: '500',
    });
  });
});
