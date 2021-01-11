/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { act, waitFor } from '@testing-library/react';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup, CoreStart } from 'kibana/public';
import moment from 'moment';
import React from 'react';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SessionsMgmtConfigSchema } from '../../';
import { STATUS, UISession } from '../../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { LocaleWrapper, mockUrls } from '../../__mocks__';
import { SearchSessionsMgmtTable } from './table';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: CoreStart;
let mockConfig: SessionsMgmtConfigSchema;
let sessionsClient: SessionsClient;
let initialTable: UISession[];
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Table', () => {
  beforeEach(async () => {
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
      },
    ];

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });
    api = new SearchSessionsMgmtAPI(
      sessionsClient,
      mockUrls,
      mockCoreSetup.notifications,
      mockConfig
    );

    [mockCoreStart] = await mockCoreSetup.getStartServices();
  });

  describe('renders', () => {
    let table: ReactWrapper;

    beforeEach(() => {
      table = mount(
        <LocaleWrapper>
          <SearchSessionsMgmtTable
            core={mockCoreStart}
            api={api}
            timezone="UTC"
            initialTable={initialTable}
            config={mockConfig}
          />
        </LocaleWrapper>
      );
    });

    test('table header cells', () => {
      expect(table.find('thead th').map((node) => node.text())).toMatchInlineSnapshot(`
        Array [
          "AppClick to sort in ascending order",
          "NameClick to sort in ascending order",
          "StatusClick to sort in ascending order",
          "CreatedClick to unsort",
          "ExpirationClick to sort in ascending order",
        ]
      `);
    });

    test('table body cells', () => {
      expect(table.find('tbody td').map((node) => node.text())).toMatchInlineSnapshot(`
        Array [
          "App",
          "Namevery background search",
          "StatusIn progress",
          "Created2 Dec, 2020, 00:19:32",
          "Expiration--",
          "",
          "",
        ]
      `);
    });
  });

  describe('fetching sessions data', () => {
    test('re-fetches data', async () => {
      jest.useFakeTimers();
      sessionsClient.find = jest.fn();
      mockConfig = {
        ...mockConfig,
        refreshInterval: moment.duration(10, 'seconds'),
      };

      mount(
        <LocaleWrapper>
          <SearchSessionsMgmtTable
            core={mockCoreStart}
            api={api}
            timezone="UTC"
            initialTable={[]}
            config={mockConfig}
          />
        </LocaleWrapper>
      );

      act(() => {
        jest.advanceTimersByTime(20000);
      });

      expect(sessionsClient.find).toBeCalledTimes(2);

      jest.useRealTimers();
    });

    test('refresh button uses the session client', async () => {
      sessionsClient.find = jest.fn();

      mockConfig = {
        ...mockConfig,
        refreshInterval: moment.duration(1, 'day'),
        refreshTimeout: moment.duration(2, 'days'),
      };

      const table = mount(
        <LocaleWrapper>
          <SearchSessionsMgmtTable
            core={mockCoreStart}
            api={api}
            timezone="UTC"
            initialTable={[]}
            config={mockConfig}
          />
        </LocaleWrapper>
      );

      expect(sessionsClient.find).not.toBeCalled();

      const buttonSelector = `[data-test-subj="session-mgmt-table-btn-refresh"] button`;

      await waitFor(() => {
        table.find(buttonSelector).first().simulate('click');
        table.update();
      });

      expect(sessionsClient.find).toBeCalledTimes(1);
    });
  });
});
