/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { EMS_V2 } from '../common/ems_v2';
import { GIS_API_PATH } from '../common/constants';
import fetch from 'node-fetch';
import _ from 'lodash';

const ROOT = `/${GIS_API_PATH}`;

export function initRoutes(server) {

  const serverConfig = server.config();
  const mapConfig = serverConfig.get('map');

  const emsV2 = new EMS_V2({
    kbnVersion: serverConfig.get('pkg.version'),
    license: server.plugins.xpack_main.info.license.getUid(),
    manifestServiceUrl: mapConfig.manifestServiceUrl,
    emsLandingPageUrl: mapConfig.emsLandingPageUrl
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/data/ems`,
    handler: async (request) => {

      if (!request.query.name) {
        return null;
      }

      const ems = await getEMSResources();//todo: should do this lazily from emsV2 instance
      const layer = ems.fileLayers.find(layer => layer.name === request.query.name);
      if (!layer) {
        return null;
      }

      const file = await fetch(layer.url);
      const fileGeoJson = await file.json();

      return fileGeoJson;

    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/meta`,
    handler: async () => {

      let ems;
      try {
        ems = await getEMSResources();
      } catch (e) {
        console.error('Cannot connect to EMS');
        console.error(e);
        ems = {
          fileLayers: [],
          tmsServices: []
        };
      }

      return ({
        data_sources: {
          ems: {
            file: ems.fileLayers,
            tms: ems.tmsServices
          },
          kibana: {
            regionmap: _.get(mapConfig, 'regionmap.layers', []),
            tilemap: _.get(mapConfig, 'tilemap', [])
          }
        }
      });
    }
  });

  async function getEMSResources() {
    const fileLayers = await emsV2.getFileLayers();
    const tmsServices = await emsV2.getTMSServices();
    return { fileLayers, tmsServices };
  }
}



