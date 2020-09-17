/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Subject } from 'rxjs';

import { AuditTrailClient } from './audit_trail_client';
import { AuditEvent } from '../types';

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
      httpServerMock.createKibanaRequest({ kibanaRequestState: { requestId: 'request id alpha' } }),
      event$,
      deps
    );
  });

  afterEach(() => {
    event$.complete();
  });

  describe('#withAuditScope', () => {
    it('registers upper level scope', (done) => {
      client.withAuditScope('scope_name');
      event$.subscribe((event) => {
        expect(event.scope).toBe('scope_name');
        done();
      });
      client.add({ message: 'message', type: 'type' });
    });

    it('populates requestId', (done) => {
      client.withAuditScope('scope_name');
      event$.subscribe((event) => {
        expect(event.requestId).toBe('request id alpha');
        done();
      });
      client.add({ message: 'message', type: 'type' });
    });

    it('throws an exception if tries to re-write a scope', () => {
      client.withAuditScope('scope_name');
      expect(() => client.withAuditScope('another_scope_name')).toThrowErrorMatchingInlineSnapshot(
        `"Audit scope is already set to: scope_name"`
      );
    });
  });
});
