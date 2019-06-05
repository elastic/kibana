/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { matchContainerName } from '../../utils/symbol_utils';

describe('matchSymbolName', () => {
  it('should match symbol that has type annotation', () => {
    expect(matchContainerName('Session', 'Session<key, value>')).toBe(true);
  });
  it('should not match symbol that has same start but not end with type annotation', () => {
    expect(matchContainerName('Session', 'SessionTail')).toBe(false);
  });
});
