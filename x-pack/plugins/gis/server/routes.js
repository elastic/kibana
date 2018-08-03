/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { EMS_V2 } from '../common/ems_v2';
import { GIS_API_PATH } from '../common/constants';

const ROOT = `/${GIS_API_PATH}`;

export function initRoutes(server) {

  server.route({
    method: 'GET',
    path: `${ROOT}/meta`,
    handler: async (req, reply) => {

      const serverConfig = server.config();
      const mapConfig = serverConfig.get('map');

      const emsV2 = new EMS_V2({
        kbnVersion: serverConfig.get('pkg.version'),
        license: server.plugins.xpack_main.info.license.getUid(),
        manifestServiceUrl: mapConfig.manifestServiceUrl,
        emsLandingPageUrl: mapConfig.emsLandingPageUrl
      });

      const fileLayers = await emsV2.getFileLayers();
      const tmsServices = await emsV2.getTMSServices();

      reply({
        data_sources: {
          ems: {
            file: fileLayers,
            tms: tmsServices
          },
          elasticsearch: {
          },
          kibana: {
            file: [],
            tms: []
          }
        }
      });
    }
  });

}



