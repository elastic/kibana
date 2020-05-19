/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSClient } from '@elastic/ems-client';
import { getEMSClient } from './meta';

jest.mock('@elastic/ems-client');

describe('default use without proxy', () => {
  beforeEach(() => {
    require('./kibana_services').getInjectedVarFunc = () => (key) => {
      if (key === 'proxyElasticMapsServiceInMaps') {
        return false;
      } else if (key === 'isEmsEnabled') {
        return true;
      } else if (key === 'emsFileApiUrl') {
        return 'https://file-api';
      } else if (key === 'emsTileApiUrl') {
        return 'https://tile-api';
      }
    };
    require('./kibana_services').getLicenseId = () => {
      return 'foobarlicenseid';
    };
    require('./kibana_services').getIsEmsEnabled = () => true;
    require('./kibana_services').getEmsTileLayerId = () => '123';
    require('./kibana_services').getEmsFileApiUrl = () => 'https://file-api';
    require('./kibana_services').getEmsTileApiUrl = () => 'https://tile-api';
    require('./kibana_services').getEmsLandingPageUrl = () => 'http://test.com';
  });

  it('should construct EMSClient with absolute file and tile API urls', async () => {
    getEMSClient();
    const mockEmsClientCall = EMSClient.mock.calls[0];
    expect(mockEmsClientCall[0].fileApiUrl.startsWith('https://file-api')).toBe(true);
    expect(mockEmsClientCall[0].tileApiUrl.startsWith('https://tile-api')).toBe(true);
  });
});
