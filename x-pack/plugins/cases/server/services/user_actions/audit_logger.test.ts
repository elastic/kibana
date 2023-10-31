/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionActions } from '../../../common/types/domain';
import type { AuditLogger } from '@kbn/security-plugin/server';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import { UserActionAuditLogger } from './audit_logger';
import type { EventDetails } from './types';

describe('UserActionAuditLogger', () => {
  let mockLogger: jest.Mocked<AuditLogger>;

  beforeEach(() => {
    mockLogger = auditLoggerMock.create();
  });

  it.each([
    [UserActionActions.add, 'change'],
    [UserActionActions.create, 'creation'],
    [UserActionActions.delete, 'deletion'],
    [UserActionActions.push_to_service, 'creation'],
    [UserActionActions.update, 'change'],
  ])('logs %s user action as event.type %s', (action, type) => {
    const eventDetails: EventDetails = {
      getMessage: (id?: string) => `id: ${id}`,
      action,
      descriptiveAction: 'action',
      savedObjectId: '123',
      savedObjectType: 'type',
    };

    const logger = new UserActionAuditLogger(mockLogger);
    logger.log(eventDetails, 'idParam');

    expect(mockLogger.log.mock.calls[0]).toMatchSnapshot();
  });

  it('does not call the internal audit logger when the event details are undefined', () => {
    const logger = new UserActionAuditLogger(mockLogger);

    logger.log();

    expect(mockLogger.log).not.toBeCalled();
  });
});
