/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTableFieldDataColumnType } from '@elastic/eui';
import { MockedKeys } from '@kbn/utility-types/jest';
import { mount } from 'enzyme';
import { CoreSetup } from 'kibana/public';
import { ReactElement } from 'react';
import { coreMock } from '../../../../../../../src/core/public/mocks';
import { SessionsClient } from '../../../../../../../src/plugins/data/public/search';
import { ActionComplete, STATUS, UISession } from '../../../../common/search/sessions_mgmt';
import { mockUrls } from '../__mocks__';
import { SearchSessionsMgmtAPI } from './api';
import { getColumns } from './get_columns';

let mockCoreSetup: MockedKeys<CoreSetup>;
let api: SearchSessionsMgmtAPI;
let sessionsClient: SessionsClient;
let handleAction: ActionComplete;
let mockSession: UISession;

describe('Background Sessions Management table column factory', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });

    api = new SearchSessionsMgmtAPI(sessionsClient, mockUrls, mockCoreSetup.notifications);
    mockCoreSetup.uiSettings.get.mockImplementation((key) => {
      return key === 'dateFormat:tz' ? 'UTC' : null;
    });

    handleAction = () => {
      throw new Error('not testing handle action');
    };

    mockSession = {
      name: 'Cool mock session',
      id: 'wtywp9u2802hahgp-thao',
      url: '/app/great-app-url/#42',
      appId: 'discovery',
      status: STATUS.IN_PROGRESS,
      created: '2020-12-02T00:19:32Z',
      expires: '2020-12-07T00:19:32Z',
      isViewable: true,
      expiresSoon: false,
    };
  });

  test('returns columns', () => {
    const columns = getColumns(api, mockCoreSetup.http, mockCoreSetup.uiSettings, handleAction);
    expect(columns).toMatchInlineSnapshot(`
      Array [
        Object {
          "field": "appId",
          "name": "Type",
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
      const [, nameColumn] = getColumns(
        api,
        mockCoreSetup.http,
        mockCoreSetup.uiSettings,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const name = mount(nameColumn.render!(mockSession.name, mockSession) as ReactElement);

      expect(name.text()).toBe('Cool mock session');
    });
  });

  // Status column
  describe('status', () => {
    test('render in_progress', () => {
      const [, , status] = getColumns(
        api,
        mockCoreSetup.http,
        mockCoreSetup.uiSettings,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const statusLine = mount(status.render!(mockSession.status, mockSession) as ReactElement);
      expect(
        statusLine
          .find('.euiText[data-test-subj="session-mgmt-view-status-tooltip-in_progress"]')
          .text()
      ).toMatchInlineSnapshot(`"In progress"`);
    });

    test('error handling', () => {
      const [, , status] = getColumns(
        api,
        mockCoreSetup.http,
        mockCoreSetup.uiSettings,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      mockSession.status = 'INVALID' as STATUS;
      const statusLine = mount(status.render!(mockSession.status, mockSession) as ReactElement);

      // no unhandled error

      expect(statusLine.text()).toMatchInlineSnapshot(`"INVALID"`);
    });
  });

  // Start Date column
  describe('startedDate', () => {
    test('render using Browser timezone', () => {
      mockCoreSetup.uiSettings.get.mockImplementation(() => 'Browser');

      const [, , , createdDateCol] = getColumns(
        api,
        mockCoreSetup.http,
        mockCoreSetup.uiSettings,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      expect(date.text()).toBe('1 Dec, 2020, 19:19:32');
    });

    test('render using AK timezone', () => {
      mockCoreSetup.uiSettings.get.mockImplementation(() => 'US/Alaska');

      const [, , , createdDateCol] = getColumns(
        api,
        mockCoreSetup.http,
        mockCoreSetup.uiSettings,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      expect(date.text()).toBe('1 Dec, 2020, 15:19:32');
    });

    test('error handling', () => {
      const [, , , createdDateCol] = getColumns(
        api,
        mockCoreSetup.http,
        mockCoreSetup.uiSettings,
        handleAction
      ) as Array<EuiTableFieldDataColumnType<UISession>>;

      mockSession.created = 'INVALID';
      const date = mount(createdDateCol.render!(mockSession.created, mockSession) as ReactElement);

      // no unhandled error
      expect(date.text()).toBe('Invalid date');
    });
  });
});
