/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rendezvousHash } from './rendezvous_hash';

test(`two pods`, function () {
  const allPods = ['foo', 'bar'];
  const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const fooPartitions = rendezvousHash('foo', allPods, allPartitions, 2);
  expect(fooPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
    ]
  `);

  const barPartitions = rendezvousHash('bar', allPods, allPartitions, 2);
  expect(barPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
      20,
    ]
  `);
});

test(`three pods`, function () {
  const allPods = ['foo', 'bar', 'quz'];
  const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const fooPartitions = rendezvousHash('foo', allPods, allPartitions, 2);
  expect(fooPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      11,
      12,
      14,
      15,
      16,
      17,
      18,
    ]
  `);

  const barPartitions = rendezvousHash('bar', allPods, allPartitions, 2);
  expect(barPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      2,
      3,
      4,
      8,
      10,
      11,
      12,
      13,
      14,
      19,
      20,
    ]
  `);

  const quzPartitions = rendezvousHash('quz', allPods, allPartitions, 2);
  expect(quzPartitions).toMatchInlineSnapshot(`
    Array [
      2,
      5,
      6,
      7,
      9,
      10,
      13,
      15,
      16,
      17,
      18,
      19,
      20,
    ]
  `);
});
