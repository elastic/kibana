/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { parsePhase0EntityID, isPhase0EntityID, buildPhase0EntityID } from './common';

describe('phase0 entity identification and parsing', () => {
  it('throws an error for an id without 3 parts', () => {
    expect(() => {
      parsePhase0EntityID('endgame|blah');
    }).toThrow();
  });

  it('parses a phase0 entity ID correctly', () => {
    expect(parsePhase0EntityID('endgame|endpoint|pid')).toStrictEqual(['endpoint', 'pid']);
  });

  it('identifies a phase0 entity ID correctly', () => {
    expect(isPhase0EntityID('endgame|some-endpoint-id|12456')).toBeTruthy();
  });

  it('builds an phase0 entity ID correctly', () => {
    const entityID = buildPhase0EntityID('endpoint', 500);
    expect(isPhase0EntityID(entityID)).toBeTruthy();
    expect(parsePhase0EntityID(entityID)).toStrictEqual(['endpoint', '500']);
  });
});
