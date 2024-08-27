/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_KIBANAS_PER_PARTITION } from '../config';
import { assignPodPartitions, getPartitionMap } from './assign_pod_partitions';
describe('assignPodPartitions', () => {
  test('two pods', () => {
    const allPods = ['foo', 'bar'];
    const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const map = getPartitionMap({
      kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
      podNames: allPods,
      partitions: allPartitions,
    });
    expect(map).toMatchInlineSnapshot(`
    Object {
      "1": Array [
        "bar",
        "foo",
      ],
      "10": Array [
        "bar",
        "foo",
      ],
      "2": Array [
        "bar",
        "foo",
      ],
      "3": Array [
        "bar",
        "foo",
      ],
      "4": Array [
        "bar",
        "foo",
      ],
      "5": Array [
        "bar",
        "foo",
      ],
      "6": Array [
        "bar",
        "foo",
      ],
      "7": Array [
        "bar",
        "foo",
      ],
      "8": Array [
        "bar",
        "foo",
      ],
      "9": Array [
        "bar",
        "foo",
      ],
    }
  `);
  });

  test('three pods', () => {
    const allPods = ['foo', 'bar', 'quz'];
    const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const map = getPartitionMap({
      kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
      podNames: allPods,
      partitions: allPartitions,
    });
    expect(map).toMatchInlineSnapshot(`
    Object {
      "1": Array [
        "bar",
        "foo",
      ],
      "10": Array [
        "bar",
        "foo",
      ],
      "2": Array [
        "quz",
        "bar",
      ],
      "3": Array [
        "foo",
        "quz",
      ],
      "4": Array [
        "bar",
        "foo",
      ],
      "5": Array [
        "quz",
        "bar",
      ],
      "6": Array [
        "foo",
        "quz",
      ],
      "7": Array [
        "bar",
        "foo",
      ],
      "8": Array [
        "quz",
        "bar",
      ],
      "9": Array [
        "foo",
        "quz",
      ],
    }
  `);
    const fooPartitions = assignPodPartitions({
      podName: 'foo',
      podNames: allPods,
      partitions: allPartitions,
      kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
    });
    expect(fooPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      3,
      4,
      6,
      7,
      9,
      10,
    ]
  `);
    const barPartitions = assignPodPartitions({
      podName: 'bar',
      podNames: allPods,
      partitions: allPartitions,
      kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
    });
    expect(barPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      2,
      4,
      5,
      7,
      8,
      10,
    ]
  `);
    const quzPartitions = assignPodPartitions({
      podName: 'quz',
      podNames: allPods,
      partitions: allPartitions,
      kibanasPerPartition: DEFAULT_KIBANAS_PER_PARTITION,
    });
    expect(quzPartitions).toMatchInlineSnapshot(`
    Array [
      2,
      3,
      5,
      6,
      8,
      9,
    ]
  `);
  });
});
