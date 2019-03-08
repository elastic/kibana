/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WmsClient } from './wms_client';
import { getCapabilitesResponse } from './test_resources/get_capabilities_response';

describe('getCapabilities', () => {
  it('Should extract nested Layer elements', async () => {
    const wmsClient = new WmsClient({ serviceUrl: 'myWMSUrl' });
    wmsClient._fetch = () => {
      return {
        status: 200,
        text: () => {
          return getCapabilitesResponse;
        }
      };
    };
    const capabilities = await wmsClient.getCapabilities();
  });
});
