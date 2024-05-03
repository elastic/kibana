/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten, uniq } from 'lodash';
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

test('thirty two pods', () => {
  const allPods = [
    'instance-0000000036 - background tasks',
    'instance-0000000037 - background tasks',
    'instance-0000000038 - background tasks',
    'instance-0000000039 - background tasks',
    'instance-0000000040 - background tasks',
    'instance-0000000041 - background tasks',
    'instance-0000000042 - background tasks',
    'instance-0000000043 - background tasks',
    'instance-0000000044 - background tasks',
    'instance-0000000045 - background tasks',
    'instance-0000000046 - background tasks',
    'instance-0000000047 - background tasks',
    'instance-0000000048 - background tasks',
    'instance-0000000049 - background tasks',
    'instance-0000000050 - background tasks',
    'instance-0000000051 - background tasks',
    'instance-0000000052 - background tasks',
    'instance-0000000053 - background tasks',
    'instance-0000000054 - background tasks',
    'instance-0000000055 - background tasks',
    'instance-0000000056 - background tasks',
    'instance-0000000057 - background tasks',
    'instance-0000000058 - background tasks',
    'instance-0000000059 - background tasks',
    'instance-0000000060 - background tasks',
    'instance-0000000061 - background tasks',
    'instance-0000000062 - background tasks',
    'instance-0000000063 - background tasks',
    'instance-0000000064 - background tasks',
    'instance-0000000065 - background tasks',
    'instance-0000000066 - background tasks',
    'instance-0000000067 - background tasks',
  ];

  const allPartitions: number[] = [];
  for (let i = 0; i < 360; i++) {
    allPartitions.push(i);
  }

  const partitionsByPod: number[][] = [];
  for (const pod of allPods) {
    partitionsByPod.push(rendezvousHash(pod, allPods, allPartitions, 2));
  }

  expect(uniq(flatten(partitionsByPod)).length).toEqual(360);
});
