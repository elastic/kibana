/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup } from 'kibana/public';
import moment from 'moment';
import * as Rx from 'rxjs';
import sinon from 'sinon';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SessionsMgmtConfigSchema } from '../';
import { mockUrls } from '../__mocks__';
import { SearchSessionsMgmtAPI } from './api';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockConfig: SessionsMgmtConfigSchema;
let sessionsClient: SessionsClient;
let findSessions: sinon.SinonStub;

describe('Background Sessions Management API', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockConfig = {
      expiresSoonWarning: moment.duration('1d'),
      maxSessions: 2000,
      refreshInterval: moment.duration('1s'),
      refreshTimeout: moment.duration('10m'),
    };

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
      const api = new SearchSessionsMgmtAPI(
        sessionsClient,
        mockUrls,
        mockCoreSetup.notifications,
        mockConfig
      );
      expect(await api.fetchTableData()).toMatchInlineSnapshot(`
        Array [
          Object {
            "actions": Array [
              "delete",
            ],
            "appId": "pizza",
            "created": undefined,
            "expires": undefined,
            "id": "hello-pizza-123",
            "isViewable": true,
            "name": "Veggie",
            "status": "baked",
            "url": "hello-cool-undefined-url",
          },
        ]
      `);
    });

    test('handle error from sessionsClient response', async () => {
      findSessions.callsFake(async () => {
        throw Boom.badImplementation('implementation is so bad');
      });

      const api = new SearchSessionsMgmtAPI(
        sessionsClient,
        mockUrls,
        mockCoreSetup.notifications,
        mockConfig
      );
      await api.fetchTableData();

      expect(mockCoreSetup.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to refresh the page!' }
      );
    });

    test('handle timeout error', async () => {
      mockConfig = {
        ...mockConfig,
        refreshInterval: moment.duration(1, 'hours'),
        refreshTimeout: moment.duration(1, 'seconds'),
      };

      findSessions.callsFake(async () => {
        return await Rx.timer(2000).toPromise();
      });

      const api = new SearchSessionsMgmtAPI(
        sessionsClient,
        mockUrls,
        mockCoreSetup.notifications,
        mockConfig
      );
      await api.fetchTableData();

      expect(mockCoreSetup.notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Fetching the Background Session info timed out after 1 seconds'
      );
    });
  });

  describe('delete', () => {
    test('send delete calls the delete endpoint with a session ID', async () => {
      const api = new SearchSessionsMgmtAPI(
        sessionsClient,
        mockUrls,
        mockCoreSetup.notifications,
        mockConfig
      );
      await api.sendDelete('abc-123-cool-session-ID');

      expect(mockCoreSetup.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Deleted session',
      });
    });

    test('error if deleting shows a toast message', async () => {
      sinon.stub(sessionsClient, 'delete').callsFake(async () => {
        throw Boom.badImplementation('implementation is so bad');
      });

      const api = new SearchSessionsMgmtAPI(
        sessionsClient,
        mockUrls,
        mockCoreSetup.notifications,
        mockConfig
      );
      await api.sendDelete('abc-123-cool-session-ID');

      expect(mockCoreSetup.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to delete the session!' }
      );
    });
  });
});
