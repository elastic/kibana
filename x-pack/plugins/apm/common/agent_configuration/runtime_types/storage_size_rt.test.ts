/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStorageSizeRt } from './storage_size_rt';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

describe('storageSizeRt', () => {
  describe('must accept any amount', () => {
    const storageSizeRt = getStorageSizeRt({});
    describe('it should not accept', () => {
      ['MB', 1, '1', '5ZB', '6YB', '-2G'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(false);
        });
      });
    });

    describe('it should accept', () => {
      ['1B', '0mb', '1b', '-2kb', '3mb', '10GB', '2TB'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(true);
        });
      });
    });
  });
  describe('must be at least 2000kB', () => {
    const storageSizeRt = getStorageSizeRt({
      min: '2000kB',
    });

    describe('it should not accept', () => {
      ['mb', '-1kb', '1MB', '3000B'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(false);
        });
      });
    });

    describe('it should return correct error message', () => {
      ['-1kb', '1MB', '3000B'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = storageSizeRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be greater than 2000kB');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });

    describe('it should accept', () => {
      ['2000kB', '2MB', '1GB', '2000000B'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(true);
        });
      });
    });
  });
  describe('must be between 0B and 3GB', () => {
    const storageSizeRt = getStorageSizeRt({
      min: '0B',
      max: '1GB',
    });
    describe('it should not accept', () => {
      ['mb', '-1B', '1001MB', '2gb', '-1GB'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(false);
        });
      });
    });
    describe('it should return correct error message', () => {
      ['mb', '-1B', '1001MB', '2gb', '-1GB'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          const result = storageSizeRt.decode(input);
          const message = PathReporter.report(result)[0];
          expect(message).toEqual('Must be between 0B and 1GB');
          expect(isRight(result)).toBeFalsy();
        });
      });
    });
    describe('it should accept', () => {
      ['500b', '100kB', '1000MB', '1GB'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(true);
        });
      });
    });
  });
});
