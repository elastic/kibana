/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getHttp,
  getLicenseId,
  getIsEmsEnabled,
  getRegionmapLayers,
  getTilemap,
  getEmsFileApiUrl,
  getEmsTileApiUrl,
  getEmsLandingPageUrl,
  getEmsFontLibraryUrl,
  getProxyElasticMapsServiceInMaps,
  getKibanaVersion,
} from './kibana_services';
import {
  GIS_API_PATH,
  EMS_FILES_CATALOGUE_PATH,
  EMS_TILES_CATALOGUE_PATH,
  EMS_GLYPHS_PATH,
  EMS_APP_NAME,
  FONTS_API_PATH,
} from '../common/constants';
import { i18n } from '@kbn/i18n';
import { EMSClient } from '@elastic/ems-client';

import fetch from 'node-fetch';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

export function getKibanaRegionList() {
  return getRegionmapLayers();
}

export function getKibanaTileMap() {
  return getTilemap();
}

function relativeToAbsolute(url) {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

function fetchFunction(...args) {
  return fetch(...args);
}

let emsClient = null;
let latestLicenseId = null;
export function getEMSClient() {
  if (!emsClient) {
    const isEmsEnabled = getIsEmsEnabled();
    if (isEmsEnabled) {
      const proxyElasticMapsServiceInMaps = getProxyElasticMapsServiceInMaps();
      const proxyPath = '';
      const tileApiUrl = proxyElasticMapsServiceInMaps
        ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_TILES_CATALOGUE_PATH}`)
        : getEmsTileApiUrl();
      const fileApiUrl = proxyElasticMapsServiceInMaps
        ? relativeToAbsolute(`${GIS_API_RELATIVE}/${EMS_FILES_CATALOGUE_PATH}`)
        : getEmsFileApiUrl();

      emsClient = new EMSClient({
        language: i18n.getLocale(),
        appVersion: getKibanaVersion(),
        appName: EMS_APP_NAME,
        tileApiUrl,
        fileApiUrl,
        landingPageUrl: getEmsLandingPageUrl(),
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
  if (!getIsEmsEnabled()) {
    return getHttp().basePath.prepend(`/${FONTS_API_PATH}/{fontstack}/{range}`);
  }
  return getProxyElasticMapsServiceInMaps()
    ? relativeToAbsolute(`../${GIS_API_PATH}/${EMS_TILES_CATALOGUE_PATH}/${EMS_GLYPHS_PATH}`) +
        `/{fontstack}/{range}`
    : getEmsFontLibraryUrl();
}

export function isRetina() {
  return window.devicePixelRatio === 2;
}
