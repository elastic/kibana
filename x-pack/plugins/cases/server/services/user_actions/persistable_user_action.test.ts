/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Actions } from '../../../common/api';
import type { AuditLogger } from '@kbn/security-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { PersistableUserAction } from './persistable_user_action';
import type { Attributes } from './types';

describe('PersistableUserAction', () => {
  let mockLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    mockLogger = auditLoggerMock.create();
  });

  it.each([
    [Actions.add, 'change'],
    [Actions.create, 'creation'],
    [Actions.delete, 'deletion'],
    [Actions.push_to_service, 'creation'],
    [Actions.update, 'change'],
  ])('logs %s user action as type %s', (action, type) => {
    const userAction = new PersistableUserAction({
      commonFields: { auditLogger: mockLogger },
      _persistableFields: { attributes: { action } as Attributes, references: [] },
      logBody: {
        createMessage: (id?: string) => `id: ${id}`,
        savedObjectId: '123',
        savedObjectType: 'type',
        eventAction: 'action',
      },
    });

    userAction.log('idParam');

    expect(mockLogger.log.mock.calls[0]).toMatchSnapshot();
  });
});
