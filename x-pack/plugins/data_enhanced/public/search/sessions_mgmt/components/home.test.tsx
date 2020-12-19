/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockedKeys } from '@kbn/utility-types/jest';
import { mount, ReactWrapper } from 'enzyme';
import { CoreSetup } from 'kibana/public';
import React from 'react';
import { coreMock } from 'src/core/public/mocks';
import { SessionsClient } from 'src/plugins/data/public/search';
import { UISession, STATUS } from '../../../../common/search/sessions_mgmt';
import { SearchSessionsMgmtAPI } from '../lib/api';
import { AsyncSearchIntroDocumentation } from '../lib/documentation';
import { LocaleWrapper, mockUrls } from '../__mocks__';
import { SearchSessionsMgmtHome } from './home';

let mockCoreSetup: MockedKeys<CoreSetup>;
let sessionsClient: SessionsClient;
let initialTable: UISession[];
let api: SearchSessionsMgmtAPI;

describe('Background Search Session Management Home', () => {
  beforeEach(() => {
    mockCoreSetup = coreMock.createSetup();

    sessionsClient = new SessionsClient({ http: mockCoreSetup.http });

    api = new SearchSessionsMgmtAPI(sessionsClient, mockUrls, mockCoreSetup.notifications);

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
  });

  describe('renders', () => {
    let home: ReactWrapper;

    beforeEach(() => {
      mockCoreSetup.uiSettings.get.mockImplementation((key: string) => {
        return key === 'dateFormat:tz' ? 'UTC' : null;
      });

      home = mount(
        <LocaleWrapper>
          <SearchSessionsMgmtHome
            api={api}
            http={mockCoreSetup.http}
            uiSettings={mockCoreSetup.uiSettings}
            initialTable={initialTable}
            documentation={new AsyncSearchIntroDocumentation()}
          />
        </LocaleWrapper>
      );
    });

    test('page title', () => {
      expect(home.find('h1').text()).toBe('Background Sessions');
    });

    test('documentation link', () => {
      const docLink = home.find('a[href]').first();
      expect(docLink.text()).toBe('Documentation');
      expect(docLink.prop('href')).toBe('/async-search-intro.html');
    });

    test('table is present', () => {
      expect(home.find(`[data-test-subj="search-sessions-mgmt-table"]`).exists()).toBe(true);
    });
  });
});
