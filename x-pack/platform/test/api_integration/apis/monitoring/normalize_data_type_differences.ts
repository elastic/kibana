/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import numeral from '@elastic/numeral';

/**
 * This function is designed to handle type differences between fields in legacy monitoring and MB monitoring.
 * During the conversion to using MB, we changed some number fields that slightly change how the output
 * is returned (such as, `long` instead of `half_float`). This function ensures the tests still pass if the
 * numbers are _basically_ the same.
 *
 * @param metrics
 * @param fixture
 * @returns
 */
export function normalizeDataTypeDifferences(metrics: any, fixture: any) {
  return Object.keys(metrics).reduce((accum: any, metricName) => {
    accum[metricName] = metrics[metricName].map((item: { data: number[][] }, index: number) => {
      return {
        ...item,
        data: item.data.map(([_x, y], index2) => {
          const data = fixture.metrics[metricName][index].data;
          if (data.length) {
            const expectedY = data[index2][1];
            if (y !== expectedY) {
              const normalizedY = numeral(y).format('0[.]00000');
              const normalizedExpectedY = numeral(y).format('0[.]00000');
              if (normalizedY === normalizedExpectedY) {
                return [_x, expectedY];
              }
            }
          }
          return [_x, y];
        }),
      };
    });
    return accum;
  }, {});
}
