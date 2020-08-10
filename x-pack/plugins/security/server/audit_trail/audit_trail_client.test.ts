/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';

import { AuditTrailClient } from './audit_trail_client';
import { AuditEvent } from '../../../../../src/core/server';

import { httpServerMock } from '../../../../../src/core/server/mocks';
import { securityMock } from '../../../security/server/mocks';
import { spacesMock } from '../../../spaces/server/mocks';

describe('AuditTrailClient', () => {
  let client: AuditTrailClient;
  let event$: Subject<AuditEvent>;
  const deps = {
    getCurrentUser: securityMock.createSetup().authc.getCurrentUser,
    getSpaceId: spacesMock.createSetup().spacesService.getSpaceId,
  };

  beforeEach(() => {
    event$ = new Subject();
    client = new AuditTrailClient(
      httpServerMock.createKibanaRequest({
        kibanaRequestState: { requestId: 'request id alpha', requestUuid: 'ignore-me' },
      }),
      event$,
      deps
    );
  });

  afterEach(() => {
    event$.complete();
  });

  it('adds event to audit log with user, tracing and namespace information', () => {
    const subscriber = jest.fn();
    event$.subscribe(subscriber);
    client.add(
      (event) => ({
        ...event,
        message: 'MESSAGE',
        event: {
          action: 'ACTION',
          type: 'access',
          category: 'database',
          outcome: 'success',
        },
      }),
      undefined
    );
    expect(subscriber).toHaveBeenCalledWith({
      event: {
        action: 'ACTION',
        category: 'database',
        outcome: 'success',
        type: 'access',
      },
      kibana: { space_id: 'default' },
      message: 'MESSAGE',
      trace: { id: 'request id alpha' },
      user: undefined,
    });
  });
});
