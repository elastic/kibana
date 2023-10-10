import { times, sample } from 'lodash';

export const weightedSample = <F>(collection: Array<[F, number]> ) => {
  const samples = collection.reduce((acc, row) => {
    const [item, weight] = row;
    return [...acc, ...times(weight).map(() => item)];
  }, [] as F[]);
  return sample(samples);
};
