import { random, sortBy, sum } from 'lodash';

export function createLatencyHistogram(totalCount: number, latency: { min: number; max: number }) {
  if (totalCount === 0) {
    return { values: [] as number[], counts: [] as number[]  };
  }
  const values: number[] = [];
  const counts: number[] = [];
  while(sum(counts) < totalCount) {
    const remaining = totalCount - sum(counts);
    const maxInterval = Math.floor(totalCount * 0.10);
    const value = random(latency.min, latency.max, true);
    const count = maxInterval < 1 ? totalCount : remaining > maxInterval ? random(1, maxInterval) : remaining;
    values.push(value);
    counts.push(count);
  }
  return { values: sortBy(values), counts: sortBy(counts) };
}

