import { random } from 'lodash';

const dataCounts: Record<string, number> = {};

export function generateCounterData(id: string, count: number, interval: number) {
  const currentCount = dataCounts[id] || 0;
  const countPerInterval = count || random(10000, 100000);
  const newCount = currentCount + ( countPerInterval * (interval / 1000) );
  dataCounts[id] = newCount;
  return newCount;
}

