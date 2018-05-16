/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { getVerticesForIds } from '../get_vertices_for_ids';

describe('getVerticesForIds', () => {
  let vertices = [];
  let ids = [];

  beforeEach(() => {
    vertices = [
      { id: 'first' },
      { id: 'second' },
      { id: 'third' },
      { id: 'fourth' }
    ];

    ids = [
      'first',
      'second',
      'fourth'
    ];
  });

  it('returns all items with matching ids', () => {
    const result = getVerticesForIds(vertices, ids);

    expect(result.length).to.be(3);
    expect(result[0].id).to.eql('first');
    expect(result[1].id).to.eql('second');
    expect(result[2].id).to.eql('fourth');
  });
});