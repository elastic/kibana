/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup } from 'kibana/public';
import sinon from 'sinon';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { SessionsClient } from '../../../../../../../src/plugins/data/public/search';
import { mockUrls } from '../__mocks__';
import { SearchSessionsMgmtAPI } from './api';

let mockCoreSetup: MockedKeys<CoreSetup>;
let sessionsClient: SessionsClient;
let findSessions: sinon.SinonStub;

describe('Background Sessions Management API', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });

    findSessions = sinon.stub(sessionsClient, 'find').callsFake(
      async () =>
        ({
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: 'baked' },
            },
          ],
        } as any) // can't reach the actual type from public
    );
  });

  describe('listing', () => {
    test('fetchDataTable calls the listing endpoint', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockUrls, mockCoreSetup.notifications);
      expect(await api.fetchTableData()).toMatchInlineSnapshot(`
        Array [
          Object {
            "actions": Array [
              "delete",
            ],
            "appId": "pizza",
            "created": undefined,
            "expires": undefined,
            "expiresSoon": false,
            "id": "hello-pizza-123",
            "isViewable": true,
            "name": "Veggie",
            "status": "baked",
            "url": "hello-cool-undefined-url",
          },
        ]
      `);
    });

    test('error handling', async () => {
      findSessions.callsFake(() => {
        throw Boom.badImplementation('implementation is so bad');
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockUrls, mockCoreSetup.notifications);
      await api.fetchTableData();

      expect(mockCoreSetup.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to refresh the page!' }
      );
    });
  });

  describe('delete', () => {
    test('send delete calls the delete endpoint with a session ID', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockUrls, mockCoreSetup.notifications);
      await api.sendDelete('abc-123-cool-session-ID');

      expect(mockCoreSetup.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Deleted session',
      });
    });

    test('error if deleting shows a toast message', async () => {
      sinon.stub(sessionsClient, 'delete').callsFake(() => {
        throw Boom.badImplementation('implementation is so bad');
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockUrls, mockCoreSetup.notifications);
      await api.sendDelete('abc-123-cool-session-ID');

      expect(mockCoreSetup.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to delete the session!' }
      );
    });
  });
});
