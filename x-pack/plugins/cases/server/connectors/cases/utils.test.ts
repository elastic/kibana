/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oracleRecordError, oracleRecord } from './index.mock';
import { isRecordError, partitionRecordsByError } from './utils';

describe('utils', () => {
  describe('isRecordError', () => {
    it('returns true if the record contains an error', () => {
      expect(isRecordError(oracleRecordError)).toBe(true);
    });

    it('returns false if the record is an oracle record', () => {
      expect(isRecordError(oracleRecord)).toBe(false);
    });

    it('returns false if the record is an empty object', () => {
      // @ts-expect-error: need to test for empty objects
      expect(isRecordError({})).toBe(false);
    });
  });

  describe('partitionRecordsByError', () => {
    it('partition records correctly', () => {
      expect(
        partitionRecordsByError([oracleRecordError, oracleRecord, oracleRecordError, oracleRecord])
      ).toEqual([
        [oracleRecord, oracleRecord],
        [oracleRecordError, oracleRecordError],
      ]);
    });
  });
});
