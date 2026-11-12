/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the test helpers themselves, kept to the one thing that can't be checked anywhere
 * else.
 *
 * `syntheticEstate` builds its `edges` itself, repeating how `getCallGraphEdges` turns calls into
 * edges, so tests of community detection and later grouping steps don't depend on the edge
 * builder. That leaves the same rule in two places. If one changes and the other doesn't, those
 * tests keep passing on edges production no longer gives, and the same estate gives different
 * edges in tests that build them from `callGraph`. This fails as soon as the two drift apart:
 * update both together.
 */

import { getCallGraphEdges } from './call_graph_edges';
import { syntheticEstate } from './test_helpers';

describe('syntheticEstate', () => {
  it('builds the same edges as getCallGraphEdges does from its call graph', () => {
    const { services, callGraph, edges } = syntheticEstate({
      teams: 12,
      servicesPerTeam: 10,
      sharedServices: 2,
      seed: 3,
    });

    expect(getCallGraphEdges({ callGraph, services }).edges).toEqual(edges);
  });
});
