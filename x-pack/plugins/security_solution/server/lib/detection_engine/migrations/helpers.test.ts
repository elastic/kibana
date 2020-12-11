/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MigrationDetails } from './types';
import { decodeMigrationToken, encodeMigrationToken } from './helpers';

describe('migration tokens', () => {
  let details: MigrationDetails;

  beforeEach(() => {
    details = {
      destinationIndex: 'destinationIndex',
      sourceIndex: 'sourceIndex',
      taskId: 'my-task-id',
    };
  });

  describe('decodeMigrationToken', () => {
    it('decodes a valid token to migration details', () => {
      const token = encodeMigrationToken({ ...details });
      const decodedDetails = decodeMigrationToken(token);
      expect(decodedDetails).toEqual(details);
    });

    it('decoding a misencoded string throws an error', () => {
      const badToken = 'not-properly-encoded';
      expect(() => decodeMigrationToken(badToken)).toThrowError(
        'An error occurred while decoding the migration token: [not-properly-encoded]'
      );
    });

    it('decoding invalid details throws an error', () => {
      const invalidDetails = ({ ...details, taskId: null } as unknown) as MigrationDetails;
      const token = encodeMigrationToken(invalidDetails);
      expect(() => decodeMigrationToken(token)).toThrowError(
        'An error occurred while decoding the migration token: [eyJkZXN0aW5hdGlvbkluZGV4IjoiZGVzdGluYXRpb25JbmRleCIsInNvdXJjZUluZGV4Ijoic291cmNlSW5kZXgiLCJ0YXNrSWQiOm51bGx9]'
      );
    });
  });

  describe('encodeMigrationToken', () => {
    it('encodes idempotently', () => {
      expect(encodeMigrationToken(details)).toEqual(encodeMigrationToken(details));
    });
  });
});
