/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { GIS_API_PATH } from '../common/constants';
import _ from 'lodash';
import { getEMSResources } from '../common/ems_util';
import chrome from 'ui/chrome';
import { i18n } from '@kbn/i18n';
import { EMSClient } from 'ui/vis/map/ems_client';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

let meta = null;
let loadingMetaPromise = null;
let isLoaded = false;
export async function getDataSources() {
  if (meta) {
    return meta;
  }

  if (loadingMetaPromise) {
    return loadingMetaPromise;
  }

  loadingMetaPromise = new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(`${GIS_API_RELATIVE}/meta`);
      const metaJson = await response.json();
      const useCors = chrome.getInjected('useCORSForElasticMapsService', true);
      const isEmsEnabled = chrome.getInjected('isEmsEnabled', true);
      if (useCors) {
        const emsClient = new EMSClient({
          language: i18n.getLocale(),
          kbnVersion: chrome.getInjected('kbnPkgVersion'),
          manifestServiceUrl: chrome.getInjected('emsManifestServiceUrl'),
          landingPageUrl: chrome.getInjected('emsLandingPageUrl')
        });
        const emsResponse = await getEMSResources(emsClient, isEmsEnabled, 'todo_use_licenseuid', true);
        metaJson.data_sources.ems = {
          file: emsResponse.fileLayers,
          tms: emsResponse.tmsServices
        };
      }
      isLoaded = true;
      meta = metaJson.data_sources;
      resolve(meta);
    } catch (e) {
      reject(e);
    }
  });
  return loadingMetaPromise;
}

/**
 * Should only call this after verifying `isMetadataLoaded` equals true
 */
export function getDataSourcesSync() {
  return meta;
}

export function isMetaDataLoaded() {
  return isLoaded;
}

export async function getEmsVectorFilesMeta() {
  const dataSource = await getDataSources();
  return _.get(dataSource, 'ems.file', []);
}

export async function getEmsTMSServices() {
  const dataSource = await getDataSources();
  return _.get(dataSource, 'ems.tms', []);
}

export async function getKibanaRegionList() {
  const dataSource = await getDataSources();
  return _.get(dataSource, 'kibana.regionmap', []);
}

export async function getKibanaTileMap() {
  const dataSource = await getDataSources();
  return _.get(dataSource, 'kibana.tilemap', {});
}
