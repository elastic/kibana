/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const KIBANAS_PER_PARTITION = 2;

export function getParitionMap(podNames: string[], partitions: number[]): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  let counter = 0;
  for (const parition of partitions) {
    map[parition] = [];
    for (let i = 0; i < KIBANAS_PER_PARTITION; i++) {
      map[parition].push(podNames.sort()[counter++ % podNames.length]);
    }
  }
  return map;
}

export function assignPodPartitions(
  podName: string,
  podNames: string[],
  partitions: number[]
): number[] {
  const map = getParitionMap(podNames, partitions);
  const podPartitions: number[] = [];
  for (const partition of Object.keys(map)) {
    if (map[Number(partition)].indexOf(podName) !== -1) {
      podPartitions.push(Number(partition));
    }
  }
  return podPartitions;
}
