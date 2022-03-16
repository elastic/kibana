/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsMigrationLogger } from 'kibana/server';
import { migrationMocks } from '../../../../../../src/core/server/mocks';
import { logError } from './utils';

describe('migration utils', () => {
  const context = migrationMocks.createContext();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('logs an error', () => {
    const log = context.log as jest.Mocked<SavedObjectsMigrationLogger>;

    logError({
      id: '1',
      context,
      error: new Error('an error'),
      docType: 'a document',
      docKey: 'key',
    });

    expect(log.error.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "Failed to migrate a document with doc id: 1 version: 8.0.0 error: an error",
        Object {
          "migrations": Object {
            "key": Object {
              "id": "1",
            },
          },
        },
      ]
    `);
  });
});
