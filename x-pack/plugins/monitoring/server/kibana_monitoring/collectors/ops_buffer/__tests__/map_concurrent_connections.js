/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapConcurrentConnections } from '../map_concurrent_connections';
import expect from 'expect.js';

describe('Map concurrent connections', () => {
  it('flatten ports', () => {
    expect(mapConcurrentConnections({ '5600': 5 })).to.be(5);
  });

  it('combine results', () => {
    expect(mapConcurrentConnections({
      '5600': 5,
      '5602': 3
    })).to.be(8);
  });
});
