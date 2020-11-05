/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { EMSClient, FileLayer, TMSService } from '@elastic/ems-client';

import fetch from 'node-fetch';
import {
  GIS_API_PATH,
  EMS_FILES_CATALOGUE_PATH,
  EMS_TILES_CATALOGUE_PATH,
  EMS_GLYPHS_PATH,
  EMS_APP_NAME,
  FONTS_API_PATH,
} from '../common/constants';
import {
  getHttp,
  getIsEmsEnabled,
  getRegionmapLayers,
  getTilemap,
  getProxyElasticMapsServiceInMaps,
  getKibanaVersion,
  getEMSSettings,
} from './kibana_services';
import { getLicenseId } from './licensed_features';
import { LayerConfig } from '../../../../src/plugins/region_map/config';

export function getKibanaRegionList(): LayerConfig[] {
  return getRegionmapLayers();
}

export function getKibanaTileMap(): unknown {
  return getTilemap();
}

export async function getEmsFileLayers(): Promise<FileLayer[]> {
  if (!getEMSSettings().isEMSEnabled()) {
    return [];
  }

  return getEMSClient().getFileLayers();
}

export async function getEmsTmsServices(): Promise<TMSService[]> {
  if (!getEMSSettings().isEMSEnabled()) {
    return [];
  }

  return getEMSClient().getTMSServices();
}

function relativeToAbsolute(url: string): string {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
}

let emsClient: EMSClient | null = null;
let latestLicenseId: string | undefined;
export function getEMSClient(): EMSClient {
  if (!emsClient) {
    const emsSettings = getEMSSettings();
    const proxyElasticMapsServiceInMaps = getProxyElasticMapsServiceInMaps();
    const proxyPath = '';
    const tileApiUrl = proxyElasticMapsServiceInMaps
      ? relativeToAbsolute(
          getHttp().basePath.prepend(`/${GIS_API_PATH}/${EMS_TILES_CATALOGUE_PATH}`)
        )
      : emsSettings.getEMSTileApiUrl();
    const fileApiUrl = proxyElasticMapsServiceInMaps
      ? relativeToAbsolute(
          getHttp().basePath.prepend(`/${GIS_API_PATH}/${EMS_FILES_CATALOGUE_PATH}`)
        )
      : emsSettings.getEMSFileApiUrl();

    emsClient = new EMSClient({
      language: i18n.getLocale(),
      appVersion: getKibanaVersion(),
      appName: EMS_APP_NAME,
      tileApiUrl,
      fileApiUrl,
      landingPageUrl: emsSettings.getEMSLandingPageUrl(),
      fetchFunction(url: string) {
        return fetch(url);
      },
      proxyPath,
    });
  }
  const licenseId = getLicenseId();
  if (latestLicenseId !== licenseId) {
    latestLicenseId = licenseId;
    emsClient.addQueryParams({ license: licenseId ? licenseId : '' });
  }
  return emsClient;
}

export function getGlyphUrl(): string {
  if (!getEMSSettings().isEMSEnabled()) {
    return getHttp().basePath.prepend(`/${FONTS_API_PATH}/{fontstack}/{range}`);
  }

  const emsSettings = getEMSSettings();
  return getProxyElasticMapsServiceInMaps()
    ? relativeToAbsolute(
        getHttp().basePath.prepend(
          `/${GIS_API_PATH}/${EMS_TILES_CATALOGUE_PATH}/${EMS_GLYPHS_PATH}`
        )
      ) + `/{fontstack}/{range}`
    : emsSettings.getEMSFontLibraryUrl();
}

export function isRetina(): boolean {
  return window.devicePixelRatio === 2;
}
