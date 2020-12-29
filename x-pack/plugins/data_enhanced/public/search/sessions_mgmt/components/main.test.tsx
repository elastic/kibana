/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup, DocLinksStart } from 'kibana/public';
import moment from 'moment';
import React from 'react';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { SessionsMgmtConfigSchema } from '..';
import { STATUS, UISession } from '../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { LocaleWrapper, mockUrls } from '../__mocks__';
import { SearchSessionsMgmtMain } from './main';

let mockCoreSetup: MockedKeys<CoreSetup>;
let mockConfig: SessionsMgmtConfigSchema;
let sessionsClient: SessionsClient;
let initialTable: UISession[];
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Main', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();
    mockConfig = {
      expiresSoonWarning: moment.duration(1, 'days'),
      maxSessions: 2000,
      refreshInterval: moment.duration(1, 'seconds'),
      refreshTimeout: moment.duration(10, 'minutes'),
    };

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });

    api = new SearchSessionsMgmtAPI(
      sessionsClient,
      mockUrls,
      mockCoreSetup.notifications,
      mockConfig
    );

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
  });

  describe('renders', () => {
    const docLinks: DocLinksStart = {
      ELASTIC_WEBSITE_URL: 'boo/',
      DOC_LINK_VERSION: '#foo',
      links: {} as any,
    };

    let main: ReactWrapper;

    beforeEach(() => {
      mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
        return key === 'dateFormat:tz' ? 'UTC' : null;
      });

      main = mount(
        <LocaleWrapper>
          <SearchSessionsMgmtMain
            api={api}
            http={mockCoreSetup.http}
            uiSettings={mockCoreSetup.uiSettings}
            initialTable={initialTable}
            documentation={new AsyncSearchIntroDocumentation(docLinks)}
            config={mockConfig}
          />
        </LocaleWrapper>
      );
    });

    test('page title', () => {
      expect(main.find('h1').text()).toBe('Background Sessions');
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
