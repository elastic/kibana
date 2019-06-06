/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { findInObject } from '../find_in_object';

const findMe = {
  foo: {
    baz: {
      id: 0,
      bar: 5,
    },
    beer: {
      id: 1,
      bar: 10,
    },
    thing: {
      id: 4,
      stuff: {
        id: 3,
        dude: [
          {
            bar: 5,
            id: 2,
          },
        ],
        baz: {
          bar: 5,
          id: 7,
        },
        nice: {
          bar: 5,
          id: 8,
        },
        thing: [],
        thing2: [[[[]], { bar: 5, id: 6 }]],
      },
    },
  },
};

describe('findInObject', () => {
  it('Finds object matching a function', () => {
    expect(findInObject(findMe, obj => obj.bar === 5).length).to.eql(5);
    expect(findInObject(findMe, obj => obj.bar === 5)[0].id).to.eql(0);
    expect(findInObject(findMe, obj => obj.bar === 5)[1].id).to.eql(2);

    expect(findInObject(findMe, obj => obj.id === 4).length).to.eql(1);
    expect(findInObject(findMe, obj => obj.id === 10000).length).to.eql(0);
  });
});
