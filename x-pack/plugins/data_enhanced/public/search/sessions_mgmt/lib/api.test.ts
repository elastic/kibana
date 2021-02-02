/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { MockedKeys } from '@kbn/utility-types/jest';
import { CoreSetup, CoreStart } from 'kibana/public';
import moment from 'moment';
import { coreMock } from 'src/core/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObjectsFindResponse } from 'src/core/server';
import { SessionsClient } from 'src/plugins/data/public/search';
import type { SessionsConfigSchema } from '../';
import { SearchSessionStatus } from '../../../../common/search';
import { mockUrls } from '../__mocks__';
import { SearchSessionsMgmtAPI } from './api';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let mockConfig: SessionsConfigSchema;
let sessionsClient: SessionsClient;

describe('Search Sessions Management API', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    mockConfig = {
      defaultExpiration: moment.duration('7d'),
      management: {
        expiresSoonWarning: moment.duration(1, 'days'),
        maxSessions: 2000,
        refreshInterval: moment.duration(1, 'seconds'),
        refreshTimeout: moment.duration(10, 'minutes'),
      },
    } as any;

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
  });

  describe('listing', () => {
    test('fetchDataTable calls the listing endpoint', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: 'complete' },
            },
          ],
        } as SavedObjectsFindResponse;
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      expect(await api.fetchTableData()).toMatchInlineSnapshot(`
        Array [
          Object {
            "actions": Array [
              "reload",
              "extend",
              "cancel",
            ],
            "appId": "pizza",
            "created": undefined,
            "expires": undefined,
            "id": "hello-pizza-123",
            "name": "Veggie",
            "reloadUrl": "hello-cool-undefined-url",
            "restoreUrl": "hello-cool-undefined-url",
            "status": "complete",
          },
        ]
      `);
    });

    test('handle error from sessionsClient response', async () => {
      sessionsClient.find = jest.fn().mockRejectedValue(new Error('implementation is so bad'));

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.fetchTableData();

      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to refresh the page!' }
      );
    });

    test('handle timeout error', async () => {
      mockConfig = {
        ...mockConfig,
        management: {
          ...mockConfig.management,
          refreshInterval: moment.duration(1, 'hours'),
          refreshTimeout: moment.duration(1, 'seconds'),
        },
      };

      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return new Promise((resolve) => {
          setTimeout(resolve, 2000);
        });
      });

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.fetchTableData();

      expect(mockCoreStart.notifications.toasts.addDanger).toHaveBeenCalledWith(
        'Fetching the Search Session info timed out after 1 seconds'
      );
    });
  });

  describe('cancel', () => {
    beforeEach(() => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: 'baked' },
            },
          ],
        } as SavedObjectsFindResponse;
      });
    });

    test('send cancel calls the cancel endpoint with a session ID', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendCancel('abc-123-cool-session-ID');

      expect(mockCoreStart.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'The search session was canceled and expired.',
      });
    });

    test('error if deleting shows a toast message', async () => {
      sessionsClient.delete = jest.fn().mockRejectedValue(new Error('implementation is so bad'));

      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendCancel('abc-123-cool-session-ID');

      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalledWith(
        new Error('implementation is so bad'),
        { title: 'Failed to cancel the search session!' }
      );
    });
  });

  describe('reload', () => {
    beforeEach(() => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: SearchSessionStatus.COMPLETE },
            },
          ],
        } as SavedObjectsFindResponse;
      });
    });

    test('send cancel calls the cancel endpoint with a session ID', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.reloadSearchSession('www.myurl.com');

      expect(mockCoreStart.application.navigateToUrl).toHaveBeenCalledWith('www.myurl.com');
    });
  });

  describe('extend', () => {
    beforeEach(() => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return {
          saved_objects: [
            {
              id: 'hello-pizza-123',
              attributes: { name: 'Veggie', appId: 'pizza', status: SearchSessionStatus.COMPLETE },
            },
          ],
        } as SavedObjectsFindResponse;
      });
    });

    test('send extend throws an error for now', async () => {
      const api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
        urls: mockUrls,
        notifications: mockCoreStart.notifications,
        application: mockCoreStart.application,
      });
      await api.sendExtend('my-id', '5d');

      expect(mockCoreStart.notifications.toasts.addError).toHaveBeenCalled();
    });
  });
});
