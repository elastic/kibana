/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTableFieldDataColumnType } from '@elastic/eui';
import { MockedKeys } from '@kbn/utility-types/jest';
import { mount } from 'enzyme';
import { CoreSetup, CoreStart } from 'kibana/public';
import moment from 'moment';
import { ReactElement } from 'react';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SessionsConfigSchema } from '../';
import { SearchSessionStatus } from '../../../../common/search';
import { OnActionComplete } from '../components';
import { UISession } from '../types';
import { mockUrls } from '../__mocks__';
import { SearchSessionsMgmtAPI } from './api';
import { getColumns } from './get_columns';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: CoreStart;
let mockConfig: SessionsConfigSchema;
let api: SearchSessionsMgmtAPI;
let sessionsClient: SessionsClient;
let handleAction: OnActionComplete;
let mockSession: UISession;

let tz = 'UTC';

describe('Search Sessions Management table column factory', () => {
  beforeEach(async () => {
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

    api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
      urls: mockUrls,
      notifications: mockCoreStart.notifications,
      application: mockCoreStart.application,
    });
    tz = 'UTC';

    handleAction = () => {
      throw new Error('not testing handle action');
    };

    mockSession = {
      name: 'Cool mock session',
      id: 'wtywp9u2802hahgp-thao',
      reloadUrl: '/app/great-app-url',
      restoreUrl: '/app/great-app-url/#42',
      appId: 'discovery',
      status: SearchSessionStatus.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
    };
  });

  test('returns columns', () => {
    const columns = getColumns(mockCoreStart, api, mockConfig, tz, handleAction);
    expect(columns).toMatchInlineSnapshot(`
      Array [
        Object {
          "field": "appId",
          "name": "App",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "name",
          "name": "Name",
          "render": [Function],
          "sortable": true,
          "width": "20%",
        },
        Object {
          "field": "status",
          "name": "Status",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "created",
          "name": "Created",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "expires",
          "name": "Expiration",
          "render": [Function],
          "sortable": true,
        },
        Object {
          "field": "status",
          "name": "",
          "render": [Function],
          "sortable": false,
        },
        Object {
          "field": "actions",
          "name": "",
          "render": [Function],
          "sortable": false,
        },
      ]
    `);
  });

  describe('name', () => {
    test('rendering', () => {
      const [, nameColumn] = getColumns(mockCoreStart, api, mockConfig, tz, handleAction) as Array<
        EuiTableFieldDataColumnType<UISession>
      >;

      const name = mount(nameColumn.render!(mockSession.name, mockSession) as ReactElement);

      expect(name.text()).toBe('Cool mock session');
    });
  });

  // Status column
  describe('status', () => {
    test('render in_progress', () => {
      const [, , status] = getColumns(mockCoreStart, api, mockConfig, tz, handleAction) as Array<
        EuiTableFieldDataColumnType<UISession>
      >;

      const statusLine = mount(status.render!(mockSession.status, mockSession) as ReactElement);
      expect(
        statusLine.find('.euiText[data-test-subj="sessionManagementStatusTooltip"]').text()
      ).toMatchInlineSnapshot(`"In progress"`);
    });

    test('error handling', () => {
      const [, , status] = getColumns(mockCoreStart, api, mockConfig, tz, handleAction) as Array<
        EuiTableFieldDataColumnType<UISession>
      >;

      mockSession.status = 'INVALID' as SearchSessionStatus;
      const statusLine = mount(status.render!(mockSession.status, mockSession) as ReactElement);

      // no unhandled error

      expect(statusLine.text()).toMatchInlineSnapshot(`"INVALID"`);
    });
  });

  // Start Date column
  describe('startedDate', () => {
    test('render using Browser timezone', () => {
      tz = 'Browser';

      const [, , , createdDateCol] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      expect(date.text()).toBe('1 Dec, 2020, 19:19:32');
    });

    test('render using AK timezone', () => {
      tz = 'US/Alaska';

      const [, , , createdDateCol] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      expect(date.text()).toBe('1 Dec, 2020, 15:19:32');
    });

    test('error handling', () => {
      const [, , , createdDateCol] = getColumns(
        mockCoreStart,
        api,
        mockConfig,
        tz,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      mockSession.created = 'INVALID';
      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      // no unhandled error
      expect(date.text()).toBe('Invalid date');
    });
  });
});
