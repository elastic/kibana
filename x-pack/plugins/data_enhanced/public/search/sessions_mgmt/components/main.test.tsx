/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup, CoreStart, DocLinksStart } from 'kibana/public';
import moment from 'moment';
import React from 'react';
import { act } from 'react-dom/test-utils';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SessionsConfigSchema } from '..';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { LocaleWrapper, mockUrls } from '../__mocks__';
import { SearchSessionsMgmtMain } from './main';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockCoreStart: MockedKeys<CoreStart>;
let mockConfig: SessionsConfigSchema;
let sessionsClient: SessionsClient;
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Main', () => {
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

    api = new SearchSessionsMgmtAPI(sessionsClient, mockConfig, {
      urls: mockUrls,
      notifications: mockCoreStart.notifications,
      application: mockCoreStart.application,
    });
  });

  describe('renders', () => {
    const docLinks: DocLinksStart = {
      ELASTIC_WEBSITE_URL: 'boo/',
      DOC_LINK_VERSION: '#foo',
      links: {} as any,
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
              api={api}
              http={mockCoreSetup.http}
              timezone="UTC"
              documentation={new AsyncSearchIntroDocumentation(docLinks)}
              config={mockConfig}
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
      expect(docLink.prop('href')).toBe(
        'boo/guide/en/elasticsearch/reference/#foo/async-search-intro.html'
      );
    });

    test('table is present', () => {
      expect(main.find(`[data-test-subj="search-sessions-mgmt-table"]`).exists()).toBe(true);
    });
  });
});
