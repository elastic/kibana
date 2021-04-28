/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObject } from 'kibana/server';
import { RawAction } from '../types';
import { getImportResultMessage } from './get_import_result_message';

describe('getImportResultMessage', () => {
  it('Return message with total imported connectors and the proper secrets need to update ', async () => {
    const savedObjectConnectors = [
      {
        type: 'action',
        id: 'ed02cb70-a6ef-11eb-bd58-6b2eae02c6ef',
        attributes: {
          actionTypeId: '.server-log',
          config: {},
          isMissingSecrets: false,
          name: 'test',
        },
        references: [],
        migrationVersion: { action: '7.14.0' },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-04-27T04:10:33.043Z',
        version: 'WzcxLDFd',
        namespaces: ['default'],
      },
      {
        type: 'action',
        id: 'e8aa94e0-a6ef-11eb-bd58-6b2eae02c6ef',
        attributes: {
          actionTypeId: '.email',
          config: [Object],
          isMissingSecrets: true,
          name: 'test',
        },
        references: [],
        migrationVersion: { action: '7.14.0' },
        coreMigrationVersion: '8.0.0',
        updated_at: '2021-04-27T04:10:33.043Z',
        version: 'WzcyLDFd',
        namespaces: ['default'],
      },
    ];
    const message = getImportResultMessage(
      (savedObjectConnectors as unknown) as Array<SavedObject<RawAction>>
    );
    expect(message).toBe('1 connector has secrets that require updates.');
  });
});
