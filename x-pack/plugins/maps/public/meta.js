/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  GIS_API_PATH,
  EMS_FILES_CATALOGUE_PATH,
  EMS_TILES_CATALOGUE_PATH,
  EMS_GLYPHS_PATH,
  EMS_APP_NAME,
} from '../common/constants';
import { i18n } from '@kbn/i18n';
import { EMSClient } from '@elastic/ems-client';
import { getInjectedVarFunc, getLicenseId } from './kibana_services';
import fetch from 'node-fetch';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

export function getKibanaRegionList() {
  return getInjectedVarFunc()('regionmapLayers');
}

export function getKibanaTileMap() {
  return getInjectedVarFunc()('tilemap');
}

function relativeToAbsolute(url) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

function fetchFunction(...args) {
  return fetch(...args);
}

export function isEmsEnabled() {
  return getInjectedVarFunc()('isEmsEnabled', true);
}

let emsClient = null;
let latestLicenseId = null;
export function getEMSClient() {
  if (!emsClient) {
    if (isEmsEnabled()) {
      const proxyElasticMapsServiceInMaps = getInjectedVarFunc()(
        'proxyElasticMapsServiceInMaps',
        false
      );
      const proxyPath = '';
      const tileApiUrl = proxyElasticMapsServiceInMaps
        ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_TILES_CATALOGUE_PATH}`)
        : getInjectedVarFunc()('emsTileApiUrl');
      const fileApiUrl = proxyElasticMapsServiceInMaps
        ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_FILES_CATALOGUE_PATH}`)
        : getInjectedVarFunc()('emsFileApiUrl');

      emsClient = new EMSClient({
        language: i18n.getLocale(),
        appVersion: getInjectedVarFunc()('kbnPkgVersion'),
        appName: EMS_APP_NAME,
        tileApiUrl,
        fileApiUrl,
        landingPageUrl: getInjectedVarFunc()('emsLandingPageUrl'),
        fetchFunction: fetchFunction, //import this from client-side, so the right instance is returned (bootstrapped from common/* would not work
        proxyPath,
      });
    } else {
      //EMS is turned off. Mock API.
      emsClient = {
        async getFileLayers() {
          return [];
        },
        async getTMSServices() {
          return [];
        },
        addQueryParams() {},
      };
    }
  }
  const licenseId = getLicenseId();
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId });
  }
  return emsClient;
}

export function getGlyphUrl() {
  if (!isEmsEnabled()) {
    return '';
  }
  return getInjectedVarFunc()('proxyElasticMapsServiceInMaps', false)
    ? relativeToAbsolute(`../${GIS_API_PATH}/${EMS_TILES_CATALOGUE_PATH}/${EMS_GLYPHS_PATH}`) +
        `/{fontstack}/{range}`
    : getInjectedVarFunc()('emsFontLibraryUrl', true);
}

export function isRetina() {
  return window.devicePixelRatio === 2;
}
