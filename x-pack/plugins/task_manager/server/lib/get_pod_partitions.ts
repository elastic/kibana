/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getParitionMap(
  podNames: string[],
  partitions: number[],
  k: number
): Record<number, string[]> {
  const map: Record<number, string[]> = {};
  let counter = 0;
  for (const parition of partitions) {
    map[parition] = [];
    for (let i = 0; i < k; i++) {
      map[parition].push(podNames.sort()[counter++ % podNames.length]);
    }
  }
  return map;
}

export function getPodPartitions(
  podName: string,
  podNames: string[],
  partitions: number[],
  k: number
): number[] {
  const map = getParitionMap(podNames, partitions, k);
  const podPartitions: number[] = [];
  for (const partition of Object.keys(map)) {
    if (map[Number(partition)].indexOf(podName) !== -1) {
      podPartitions.push(Number(partition));
    }
  }
  return podPartitions;
}

export function getParititonCountByPod(
  podNames: string[],
  partitions: number[],
  k: number
): Record<string, number> {
  const map = getParitionMap(podNames, partitions, k);
  const counts: Record<string, number> = {};
  for (const podName of podNames) {
    counts[podName] = 0;
  }
  for (const partition of Object.keys(map)) {
    for (const podName of map[Number(partition)]) {
      counts[podName]++;
    }
  }
  return counts;
}
