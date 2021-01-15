/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { deserializer } from '../form';

import {
  absoluteTimingToRelativeTiming,
  calculateRelativeTimingMs,
} from './absolute_timing_to_relative_timing';

describe('Conversion of absolute policy timing to relative timing', () => {
  describe('calculateRelativeTimingMs', () => {
    describe('policy that never deletes data (keep forever)', () => {
      test('always hot', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: Infinity, phases: { hot: Infinity, warm: undefined, cold: undefined } });
      });

      test('hot, then always warm', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: Infinity, phases: { hot: 0, warm: Infinity, cold: undefined } });
      });

      test('hot, then warm, then always cold', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '1M',
                  actions: {},
                },
                cold: {
                  min_age: '34d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: Infinity,
          phases: {
            hot: 2592000000,
            warm: 345600000,
            cold: Infinity,
          },
        });
      });

      test('hot, then always cold', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                cold: {
                  min_age: '34d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: Infinity,
          phases: { hot: 2937600000, warm: undefined, cold: Infinity },
        });
      });
    });

    describe('policy that deletes data', () => {
      test('hot, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                delete: {
                  min_age: '1M',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 2592000000,
          phases: {
            hot: 2592000000,
            warm: undefined,
            cold: undefined,
          },
        });
      });

      test('hot, then warm, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '24d',
                  actions: {},
                },
                delete: {
                  min_age: '1M',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 2592000000,
          phases: {
            hot: 2073600000,
            warm: 518400000,
            cold: undefined,
          },
        });
      });

      test('hot, then warm, then cold, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '24d',
                  actions: {},
                },
                cold: {
                  min_age: '2M',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 5270400000,
          phases: {
            hot: 2073600000,
            warm: 3196800000,
            cold: 0,
          },
        });
      });

      test('hot, then cold, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                cold: {
                  min_age: '2M',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 5270400000,
          phases: {
            hot: 5270400000,
            warm: undefined,
            cold: 0,
          },
        });
      });

      test('hot, then long warm, then short cold, then delete', () => {
        expect(
          calculateRelativeTimingMs(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '2M',
                  actions: {},
                },
                cold: {
                  min_age: '1d',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 5270400000,
          phases: {
            hot: 5270400000,
            warm: 0,
            cold: 0,
          },
        });
      });
    });
  });

  describe('absoluteTimingToRelativeTiming', () => {
    describe('policy that never deletes data (keep forever)', () => {
      test('always hot', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: 'Forever', hot: 'Forever', warm: undefined, cold: undefined });
      });

      test('hot, then always warm', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: 'Forever', hot: 'Less than a day', warm: 'Forever', cold: undefined });
      });

      test('hot, then warm, then always cold', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '1M',
                  actions: {},
                },
                cold: {
                  min_age: '34d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: 'Forever',
          hot: '30 days',
          warm: '4 days',
          cold: 'Forever',
        });
      });

      test('hot, then always cold', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                cold: {
                  min_age: '34d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({ total: 'Forever', hot: '34 days', warm: undefined, cold: 'Forever' });
      });
    });

    describe('policy that deletes data', () => {
      test('hot, then delete', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                delete: {
                  min_age: '1M',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: '30 days',
          hot: '30 days',
          warm: undefined,
          cold: undefined,
        });
      });

      test('hot, then warm, then delete', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '24d',
                  actions: {},
                },
                delete: {
                  min_age: '1M',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: '30 days',
          hot: '24 days',
          warm: '6 days',
          cold: undefined,
        });
      });

      test('hot, then warm, then cold, then delete', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '24d',
                  actions: {},
                },
                cold: {
                  min_age: '2M',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: '61 days',
          hot: '24 days',
          warm: '37 days',
          cold: 'Less than a day',
        });
      });

      test('hot, then cold, then delete', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                cold: {
                  min_age: '2M',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: '61 days',
          hot: '61 days',
          warm: undefined,
          cold: 'Less than a day',
        });
      });

      test('hot, then long warm, then short cold, then delete', () => {
        expect(
          absoluteTimingToRelativeTiming(
            deserializer({
              name: 'test',
              phases: {
                hot: {
                  min_age: '0ms',
                  actions: {},
                },
                warm: {
                  min_age: '2M',
                  actions: {},
                },
                cold: {
                  min_age: '1d',
                  actions: {},
                },
                delete: {
                  min_age: '2d',
                  actions: {},
                },
              },
            })
          )
        ).toEqual({
          total: '61 days',
          hot: '61 days',
          warm: 'Less than a day',
          cold: 'Less than a day',
        });
      });
    });
  });
});
