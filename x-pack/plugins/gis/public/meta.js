/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { GIS_API_PATH } from '../common/constants';
import _ from 'lodash';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

let meta = null;
let isLoaded = false;
export async function getDataSources() {
  if (!meta) {
    meta = new Promise(async (resolve, reject) => {
      try {
        const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
        const metaJson = await meta.json();
        isLoaded = true;
        resolve(metaJson.data_sources);
      } catch(e) {
        reject(e);
      }
    });
  }
  return meta;
}

export function getDataSourcesSync() {
  if (!isLoaded) {
    throw new Error('Metadata is not loaded yet. Use isMetadataLoaded first before calling this function.');
  }
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
  return _.get(dataSource, 'kibana.tilemap', []);
}
