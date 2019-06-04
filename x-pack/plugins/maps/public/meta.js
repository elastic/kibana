/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { GIS_API_PATH, EMS_META_PATH } from '../common/constants';
import _ from 'lodash';
import { getEMSResources } from '../common/ems_util';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { EMSClient } from 'ui/vis/map/ems_client';
import { xpackInfo } from './kibana_services';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

let emsSources = null;
let loadingMetaPromise = null;

export async function getEMSDataSources() {
  if (emsSources) {
    return emsSources;
  }

  if (loadingMetaPromise) {
    return loadingMetaPromise;
  }

  loadingMetaPromise = new Promise(async (resolve, reject) => {
    try {
      const proxyElasticMapsServiceInMaps = chrome.getInjected('proxyElasticMapsServiceInMaps', false);
      if (proxyElasticMapsServiceInMaps) {
        const fullResponse = await fetch(`${GIS_API_RELATIVE}/${EMS_META_PATH}`);
        emsSources = await fullResponse.json();
      } else {
        const emsClient = new EMSClient({
          language: i18n.getLocale(),
          kbnVersion: chrome.getInjected('kbnPkgVersion'),
          manifestServiceUrl: chrome.getInjected('emsManifestServiceUrl'),
          landingPageUrl: chrome.getInjected('emsLandingPageUrl')
        });
        const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
        const xpackMapsFeature = xpackInfo.get('features.maps');
        const licenseId = xpackMapsFeature && xpackMapsFeature.maps && xpackMapsFeature.uid ? xpackMapsFeature.uid :  '';

        const emsResponse = await getEMSResources(emsClient, isEmsEnabled, licenseId, false);
        emsSources = {
          ems: {
            file: emsResponse.fileLayers,
            tms: emsResponse.tmsServices
          }
        };
      }
      resolve(emsSources);
    } catch (e) {
      reject(e);
    }
  });
  return loadingMetaPromise;
}

export async function getEmsVectorFilesMeta() {
  const dataSource = await getEMSDataSources();
  return _.get(dataSource, 'ems.file', []);
}

export async function getEmsTMSServices() {
  const dataSource = await getEMSDataSources();
  return _.get(dataSource, 'ems.tms', []);
}

export function getKibanaRegionList() {
  return chrome.getInjected('regionmapLayers');
}

export function getKibanaTileMap() {
  return chrome.getInjected('tilemap');
}
