/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
10000 to 10K
10100 to 10.1K
1000000 to 1M
1000000000 to 1B
*/
export const shortenCountIntoString = (count: number): string => {
  if (count < 10000) {
    return count.toString();
  }
  const si = [
    { v: 1e3, s: 'K' },
    { v: 1e6, s: 'M' },
    { v: 1e9, s: 'B' },
    { v: 1e12, s: 'T' },
    { v: 1e15, s: 'P' },
    { v: 1e18, s: 'E' },
  ];
  let i;
  for (i = si.length - 1; i > 0; i--) {
    if (count >= si[i].v) {
      break;
    }
  }

  return (
    toFixedWithoutRounding(count / si[i].v, 1).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, '$1') + si[i].s
  );
};

const toFixedWithoutRounding = (n: number, p: number) => {
  const result = n.toFixed(p);
  return +result <= n ? result : (+result - Math.pow(0.1, p)).toFixed(p);
};
