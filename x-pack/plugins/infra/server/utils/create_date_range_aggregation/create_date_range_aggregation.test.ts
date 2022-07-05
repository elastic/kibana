/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDateRangeAggregation } from './create_date_range_aggregation';

describe('createDateRangeAggregation', () => {
  it('should do the thing with parsing interval strings', () => {
    const actual = createDateRangeAggregation({
      timerange: {
        from: 'now-15m',
        to: 'now',
      },
      targetRangeSize: '>=1m',
    });

    expect(actual.date_range.ranges.length).toEqual(15);
  });
});

// Need to restructure these tests around focus areas
// describe('timerangeToBuckets', () => {
//   it('should support creating exact size ranges', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: '2022-06-27T14:18:41.443Z',
//         to: '2022-06-28T14:18:41.443Z',
//       },
//       rangeSizeSeconds: 60,
//       rangeSizeMode: 'exact',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual.date_range.ranges.length).toEqual(1440);
//   });

//   it('should support creating exact size ranges with partials', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: '2022-06-27T14:18:41.443Z',
//         to: '2022-06-28T14:19:11.443Z',
//       },
//       rangeSizeSeconds: 60,
//       rangeSizeMode: 'exact',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual.date_range.ranges.length).toEqual(1441);
//   });

//   it('should support millisecond number timeranges', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: 1656339581543 - 10000 * 10,
//           to: 1656339581543,
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).not.toThrow();
//   });

//   it('should support ISO date string timeranges', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: '2022-06-27T14:18:41.443Z',
//           to: '2022-06-27T14:19:41.443Z',
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).not.toThrow();
//   });

//   it('should support now based datemath timeranges', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: 'now-15m',
//           to: 'now',
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).not.toThrow();
//   });

//   it('should support date based datemath timeranges', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: '2022-05-18||-15m',
//           to: '2022-05-18||-10m',
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).not.toThrow();
//   });

//   it('should throw for invalid date strings', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: '22-06-27T14:18:41.443Z',
//           to: '22-06-27T14:19:41.443Z',
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).toThrowError(new Error('Invalid date string format'));
//   });

//   it('should throw for invalid datemath strings', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: 'now-15n',
//           to: 'now',
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).toThrowError(new Error('Invalid datemath format'));
//   });

//   it('should throw if the duration is smaller than the bucket size', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: 1656339581543 - 9000,
//           to: 1656339581543,
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: false,
//       })
//     ).toThrowError(new Error('Duration is shorter than bucket size'));
//   });

//   it('should allow empty buckets', () => {
//     expect(() =>
//       timerangeToBuckets({
//         timerange: {
//           from: 1656339581543 - 9000,
//           to: 1656339581543,
//         },
//         rangeSizeSeconds: 10,
//         rangeSizeMode: 'approximate',
//         granularity: 100,
//         field: '@timestamp',
//         partialBucketSetting: 'start',
//         allowEmptyBuckets: true,
//       })
//     ).not.toThrowError(new Error('Duration is shorter than bucket size'));
//   });

//   it('should enforce the approximate bucket size over the desired granularity', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: 1656339581543 - 60000 * 15,
//         to: 1656339581543,
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual.date_range.ranges.length).toEqual(90);
//   });

//   it('should drop partial bucket if its size would be 0', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: 1656339581543 - 60000 * 15,
//         to: 1656339581543,
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 50,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual.date_range.ranges.length).toEqual(50);
//   });

//   it('should automatically adjust the bucket size to fit the granularity', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: 1656339581543 - 60000 * 15,
//         to: 1656339581543,
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 50,
//       field: '@timestamp',
//       partialBucketSetting: 'drop',
//       allowEmptyBuckets: false,
//     });

//     expect(actual.date_range.ranges.length).toEqual(50);
//   });

//   it('should align to end (partial bucket at the start)', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: 1656339581543 - 60100,
//         to: 1656339581543,
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual).toEqual({
//       date_range: {
//         field: '@timestamp',
//         ranges: [
//           {
//             from: '2022-06-27T14:18:41.443Z',
//             to: '2022-06-27T14:18:41.543Z',
//           },
//           {
//             from: '2022-06-27T14:18:41.543Z',
//             to: '2022-06-27T14:18:51.543Z',
//           },
//           {
//             from: '2022-06-27T14:18:51.543Z',
//             to: '2022-06-27T14:19:01.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:01.543Z',
//             to: '2022-06-27T14:19:11.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:11.543Z',
//             to: '2022-06-27T14:19:21.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:21.543Z',
//             to: '2022-06-27T14:19:31.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:31.543Z',
//             to: '2022-06-27T14:19:41.543Z',
//           },
//         ],
//       },
//     });
//   });

//   it('should align to end (partial bucket at the start) for date strings', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: '2022-06-27T14:18:41.443Z',
//         to: '2022-06-27T14:19:41.543Z',
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual).toEqual({
//       date_range: {
//         field: '@timestamp',
//         ranges: [
//           {
//             from: '2022-06-27T14:18:41.443Z',
//             to: '2022-06-27T14:18:41.543Z',
//           },
//           {
//             from: '2022-06-27T14:18:41.543Z',
//             to: '2022-06-27T14:18:51.543Z',
//           },
//           {
//             from: '2022-06-27T14:18:51.543Z',
//             to: '2022-06-27T14:19:01.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:01.543Z',
//             to: '2022-06-27T14:19:11.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:11.543Z',
//             to: '2022-06-27T14:19:21.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:21.543Z',
//             to: '2022-06-27T14:19:31.543Z',
//           },
//           {
//             from: '2022-06-27T14:19:31.543Z',
//             to: '2022-06-27T14:19:41.543Z',
//           },
//         ],
//       },
//     });
//   });

//   it('should align to end (partial bucket at the start) for date math', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: '2022-01-01T10:10:10.000Z||-10m',
//         to: '2022-01-01T10:10:10.000Z||-9m',
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'start',
//       allowEmptyBuckets: false,
//     });

//     expect(actual).toEqual({
//       date_range: {
//         field: '@timestamp',
//         ranges: [
//           {
//             from: '2022-01-01T10:00:10.000Z',
//             to: '2022-01-01T10:00:20.000Z',
//           },
//           {
//             from: '2022-01-01T10:00:20.000Z',
//             to: '2022-01-01T10:00:30.000Z',
//           },
//           {
//             from: '2022-01-01T10:00:30.000Z',
//             to: '2022-01-01T10:00:40.000Z',
//           },
//           {
//             from: '2022-01-01T10:00:40.000Z',
//             to: '2022-01-01T10:00:50.000Z',
//           },
//           {
//             from: '2022-01-01T10:00:50.000Z',
//             to: '2022-01-01T10:01:00.000Z',
//           },
//           {
//             from: '2022-01-01T10:01:00.000Z',
//             to: '2022-01-01T10:01:10.000Z',
//           },
//         ],
//       },
//     });
//   });

//   it('should align to start (partial bucket at the end)', () => {
//     const actual = timerangeToBuckets({
//       timerange: {
//         from: 1656339581543 - 60100,
//         to: 1656339581543,
//       },
//       rangeSizeSeconds: 10,
//       rangeSizeMode: 'approximate',
//       granularity: 100,
//       field: '@timestamp',
//       partialBucketSetting: 'end',
//       allowEmptyBuckets: false,
//     });

//     expect(actual).toEqual({
//       date_range: {
//         field: '@timestamp',
//         ranges: [
//           {
//             from: '2022-06-27T14:18:41.443Z',
//             to: '2022-06-27T14:18:51.443Z',
//           },
//           {
//             from: '2022-06-27T14:18:51.443Z',
//             to: '2022-06-27T14:19:01.443Z',
//           },
//           {
//             from: '2022-06-27T14:19:01.443Z',
//             to: '2022-06-27T14:19:11.443Z',
//           },
//           {
//             from: '2022-06-27T14:19:11.443Z',
//             to: '2022-06-27T14:19:21.443Z',
//           },
//           {
//             from: '2022-06-27T14:19:21.443Z',
//             to: '2022-06-27T14:19:31.443Z',
//           },
//           {
//             from: '2022-06-27T14:19:31.443Z',
//             to: '2022-06-27T14:19:41.443Z',
//           },
//           {
//             from: '2022-06-27T14:19:41.443Z',
//             to: '2022-06-27T14:19:41.543Z',
//           },
//         ],
//       },
//     });
//   });
// });
