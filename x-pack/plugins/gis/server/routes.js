/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { EMS_V2 } from '../common/ems_v2';
import { GIS_API_PATH } from '../common/constants';
import fetch from 'node-fetch';

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
    handler: async (request, reply) => {

      const ems = await getEMSResources();//todo: should do this lazily from emsV2 instance
      const layer = ems.fileLayers.find(layer => {
        return layer.name === request.query.name;
      });

      if (!layer) {
        return null;
      }
      const file = await fetch(layer.url);
      const fileGeoJson = await file.json();

      reply(fileGeoJson);

    }
  });


  server.route({
    method: 'GET',
    path: `${ROOT}/meta`,
    handler: async (request, reply) => {

      const ems = await getEMSResources();
      const indexPatterns = await getIndexPatterns(request);

      reply({
        data_sources: {
          ems: {
            file: ems.fileLayers,
            tms: ems.tmsServices
          },
          elasticsearch: {
            indexPatterns: indexPatterns
          },
          kibana: {
            file: [],
            tms: []
          }
        }
      });
    }
  });


  async function getIndexPatterns(req) {

    const savedObjectsClient = req.getSavedObjectsClient();
    const things = await savedObjectsClient.find({ type: 'index-pattern' });

    const indexPatterns = things.saved_objects.map((indexPattern) => {
      return {
        id: indexPattern.id,
        title: indexPattern.attributes.title,
        timeFieldName: indexPattern.attributes.timeFieldName,
        fields: JSON.parse(indexPattern.attributes.fields)
      };
    });

    const geoIndexPatterns = indexPatterns.map(indexPattern => {
      const geoPointField = indexPattern.fields.find(field => {
        return field.type === 'geo_point';
      });
      indexPattern.isGeohashable = !!geoPointField;
      return indexPattern;
    });

    return geoIndexPatterns;
  }


  async function getEMSResources() {
    const fileLayers = await emsV2.getFileLayers();
    const tmsServices = await emsV2.getTMSServices();
    return { fileLayers, tmsServices };
  }


}



