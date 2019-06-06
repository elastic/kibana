/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getEMSDataSources
} from './meta';


jest.mock('ui/chrome',
  () => ({
    getBasePath: () => {
      return '<basepath>';
    },
    getInjected(key) {
      if (key === 'proxyElasticMapsServiceInMaps') {
        return false;
      } else if (key === 'isEmsEnabled') {
        return true;
      }
    },
    getUiSettingsClient: () => {
      return {
        get: () => {
          return '';
        }
      };
    },
  })
);

jest.mock('ui/vis/map/ems_client', () => {
  const module =  require('ui/vis/__tests__/map/ems_client_util.js');
  function EMSClient() {
    return module.getEMSClient();
  }
  return {
    EMSClient: EMSClient
  };
});

jest.mock('./kibana_services', () => {
  return {
    xpackInfo: {
      get() {
        return 'foobarlicenseid';
      }
    }
  };
});

describe('default use without proxy', () => {

  it('should return absolute urls', async () => {


    const resources = await getEMSDataSources();
    expect(resources.ems.tms[0].url.startsWith('https://raster-style.foobar')).toBe(true);
    expect(resources.ems.file[0].url.startsWith('https://vector-staging.maps.elastic.co/files')).toBe(true);
    expect(resources.ems.file[1].url.startsWith('https://vector-staging.maps.elastic.co/files')).toBe(true);
  });
});
