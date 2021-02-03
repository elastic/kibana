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
import { SearchSessionStatus } from '../../../../../common/search';
import { SessionsConfigSchema } from '../../';
import { SearchSessionsMgmtAPI } from '../../lib/api';
import { LocaleWrapper, mockUrls } from '../../__mocks__';
import { SearchSessionsMgmtTable } from './table';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: CoreStart;
let mockConfig: SessionsConfigSchema;
let sessionsClient: SessionsClient;
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Table', () => {
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
  });

  describe('renders', () => {
    let table: ReactWrapper;

    const getInitialResponse = () => {
      return {
        saved_objects: [
          {
            id: 'wtywp9u2802hahgp-flps',
            attributes: {
              name: 'very background search',
              id: 'wtywp9u2802hahgp-flps',
              url: '/app/great-app-url/#48',
              appId: 'canvas',
              status: SearchSessionStatus.IN_PROGRESS,
              created: '2020-12-02T00:19:32Z',
              expires: '2020-12-07T00:19:32Z',
            },
          },
        ],
      };
    };

    test('table header cells', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return getInitialResponse();
      });

      await act(async () => {
        table = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
            />
          </LocaleWrapper>
        );
      });

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

    test('table body cells', async () => {
      sessionsClient.find = jest.fn().mockImplementation(async () => {
        return getInitialResponse();
      });

      await act(async () => {
        table = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
            />
          </LocaleWrapper>
        );
      });
      table.update();

      expect(table.find('tbody td').map((node) => node.text())).toMatchInlineSnapshot(`
        Array [
          "App",
          "Namevery background search",
          "StatusIn progress",
          "Created2 Dec, 2020, 00:19:32",
          "Expiration7 Dec, 2020, 00:19:32",
          "",
          "",
        ]
      `);
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/88928
  describe.skip('fetching sessions data', () => {
    test('re-fetches data', async () => {
      jest.useFakeTimers();
      sessionsClient.find = jest.fn();
      mockConfig = {
        ...mockConfig,
        management: {
          ...mockConfig.management,
          refreshInterval: moment.duration(10, 'seconds'),
        },
      };

      await act(async () => {
        mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
            />
          </LocaleWrapper>
        );
        jest.advanceTimersByTime(20000);
      });

      // 1 for initial load + 2 refresh calls
      expect(sessionsClient.find).toBeCalledTimes(3);

      jest.useRealTimers();
    });

    test('refresh button uses the session client', async () => {
      sessionsClient.find = jest.fn();

      mockConfig = {
        ...mockConfig,
        management: {
          ...mockConfig.management,
          refreshInterval: moment.duration(1, 'day'),
          refreshTimeout: moment.duration(2, 'days'),
        },
      };

      await act(async () => {
        const table = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtTable
              core={mockCoreStart}
              api={api}
              timezone="UTC"
              config={mockConfig}
            />
          </LocaleWrapper>
        );

        const buttonSelector = `[data-test-subj="sessionManagementRefreshBtn"] button`;

        await waitFor(() => {
          table.find(buttonSelector).first().simulate('click');
          table.update();
        });
      });

      // initial call + click
      expect(sessionsClient.find).toBeCalledTimes(2);
    });
  });
});
