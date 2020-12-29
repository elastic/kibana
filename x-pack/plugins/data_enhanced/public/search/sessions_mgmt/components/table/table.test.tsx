/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { waitFor } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup } from 'kibana/public';
import moment from 'moment';
import React from 'react';
import sinon from 'sinon';
import { coreMock } from 'src/core/public/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import type { SavedObjectsFindResponse } from 'src/core/server';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SessionsMgmtConfigSchema } from '../../';
import { STATUS, UISession } from '../../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { LocaleWrapper, mockUrls } from '../../__mocks__';
import { SearchSessionsMgmtTable } from './table';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockConfig: SessionsMgmtConfigSchema;
let sessionsClient: SessionsClient;
let initialTable: UISession[];
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Table', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockConfig = {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    };

    initialTable = [
      {
        name: 'very background search',
        id: 'wtywp9u2802hahgp-flps',
        url: '/app/great-app-url/#48',
        appId: 'canvas',
        status: STATUS.IN_PROGRESS,
        created: '2020-12-02T00:19:32Z',
        expires: '2020-12-07T00:19:32Z',
        isViewable: true,
        expiresSoon: false,
      },
    ];

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
    api = new SearchSessionsMgmtAPI(
      sessionsClient,
      mockUrls,
      mockCoreSetup.notifications,
      mockConfig
    );
  });

  describe('renders', () => {
    let table: ReactWrapper;

    beforeEach(() => {
      mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
        return key === 'dateFormat:tz' ? 'UTC' : null;
      });

      table = mount(
        <LocaleWrapper>
          <SearchSessionsMgmtTable
            api={api}
            http={mockCoreSetup.http}
            uiSettings={mockCoreSetup.uiSettings}
            initialTable={initialTable}
            config={mockConfig}
          />
        </LocaleWrapper>
      );
    });

    test('table header cells', () => {
      expect(table.find('thead th').map((node) => node.text())).toMatchInlineSnapshot(`
        Array [
          "TypeClick to sort in ascending order",
          "NameClick to sort in ascending order",
          "StatusClick to sort in ascending order",
          "CreatedClick to sort in ascending order",
          "ExpirationClick to sort in ascending order",
        ]
      `);
    });

    test('table body cells', () => {
      expect(table.find('tbody td').map((node) => node.text())).toMatchInlineSnapshot(`
        Array [
          "Type",
          "Namevery background search",
          "StatusIn progress",
          "Created2 Dec, 2020, 00:19:32",
          "Expiration--",
          "",
          "View",
        ]
      `);
    });
  });

  describe('fetching sessions data', () => {
    test('refresh button uses the session client', async () => {
      const findSessions = sinon
        .stub(sessionsClient, 'find')
        .callsFake(async () => ({} as SavedObjectsFindResponse<unknown>));

      mockConfig = {
        ...mockConfig,
        refreshInterval: moment.duration(1, 'day'),
        refreshTimeout: moment.duration(2, 'days'),
      };

      const table = mount(
        <LocaleWrapper>
          <SearchSessionsMgmtTable
            api={api}
            http={mockCoreSetup.http}
            uiSettings={mockCoreSetup.uiSettings}
            initialTable={[]}
            config={mockConfig}
          />
        </LocaleWrapper>
      );

      expect(findSessions.called).toBe(false);

      const buttonSelector = `[data-test-subj="session-mgmt-table-btn-refresh"] button`;

      await waitFor(() => {
        table.find(buttonSelector).first().simulate('click');
        table.update();
      });

      expect(findSessions.called).toBe(true);
    });
  });
});
