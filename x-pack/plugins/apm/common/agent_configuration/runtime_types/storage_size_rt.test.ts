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
  describe('when no min or max defined', () => {
    const storageSizeRt = getStorageSizeRt({});
    describe('it should not accept unknown values or units', () => {
      ['MB', 1, '1', '5ZB', '6YB', '-2G'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(false);
        });
      });
    });

    describe('it should accept integer values with known units', () => {
      ['1B', '0mb', '1b', '-2kb', '3mb', '10GB', '2TB'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(true);
        });
      });
    });
  });
  describe('when a min size is given', () => {
    const storageSizeRt = getStorageSizeRt({
      min: '2000kB',
    });

    describe('it should not accept values below min', () => {
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

    describe('is should accept values at or above min', () => {
      ['2000kB', '2MB', '1GB', '2000000B'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(true);
        });
      });
    });
  });
  describe('when a range is given', () => {
    const storageSizeRt = getStorageSizeRt({
      min: '0B',
      max: '1GB',
    });
    describe('it should not accept values outside range', () => {
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
    describe('it should accept values within range', () => {
      ['500b', '100kB', '1000MB', '1GB'].map((input) => {
        it(`${JSON.stringify(input)}`, () => {
          expect(isRight(storageSizeRt.decode(input))).toBe(true);
        });
      });
    });
  });
});
