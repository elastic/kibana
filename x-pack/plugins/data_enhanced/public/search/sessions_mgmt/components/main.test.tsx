/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup, CoreStart, DocLinksStart } from 'kibana/public';
import moment from 'moment';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { IManagementSectionsPluginsSetup, SessionsConfigSchema } from '..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { LocaleWrapper } from '../__mocks__';
import { SearchSessionsMgmtMain } from './main';
import { dataPluginMock } from '../../../../../../../src/plugins/data/public/mocks';
import { managementPluginMock } from '../../../../../../../src/plugins/management/public/mocks';
import { SharePluginStart } from '../../../../../../../src/plugins/share/public';
import { sharePluginMock } from '../../../../../../../src/plugins/share/public/mocks';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let mockShareStart: jest.Mocked<SharePluginStart>;
let mockPluginsSetup: IManagementSectionsPluginsSetup;
let mockConfig: SessionsConfigSchema;
let sessionsClient: SessionsClient;
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Main', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockCoreStart = coreMock.createStart();
    mockShareStart = sharePluginMock.createStartContract();
    mockPluginsSetup = {
      data: dataPluginMock.createSetupContract(),
      management: managementPluginMock.createSetupContract(),
    };
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
      locators: mockShareStart.url.locators,
      notifications: mockCoreStart.notifications,
      application: mockCoreStart.application,
    });
  });

  describe('renders', () => {
    const docLinks: DocLinksStart = {
      ELASTIC_WEBSITE_URL: `boo/`,
      DOC_LINK_VERSION: `#foo`,
      links: {
        search: { sessions: `mock-url` } as any,
      } as any,
    };

    let main: ReactWrapper;

    beforeEach(async () => {
      mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
        return key === 'dateFormat:tz' ? 'UTC' : null;
      });

      await act(async () => {
        main = mount(
          <LocaleWrapper>
            <SearchSessionsMgmtMain
              core={mockCoreStart}
              plugins={mockPluginsSetup}
              api={api}
              http={mockCoreSetup.http}
              timezone="UTC"
              documentation={new AsyncSearchIntroDocumentation(docLinks)}
              config={mockConfig}
              kibanaVersion={'8.0.0'}
            />
          </LocaleWrapper>
        );
      });
    });

    test('page title', () => {
      expect(main.find('h1').text()).toBe('Search Sessions');
    });

    test('documentation link', () => {
      const docLink = main.find('a[href]').first();
      expect(docLink.text()).toBe('Documentation');
      expect(docLink.prop('href')).toBe('mock-url');
    });

    test('table is present', () => {
      expect(main.find(`[data-test-subj="search-sessions-mgmt-table"]`).exists()).toBe(true);
    });
  });
});
