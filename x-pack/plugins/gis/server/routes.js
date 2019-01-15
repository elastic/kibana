/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { GIS_API_PATH } from '../common/constants';
import fetch from 'node-fetch';
import _ from 'lodash';

const ROOT = `/${GIS_API_PATH}`;

export function initRoutes(server, licenseUid) {

  const serverConfig = server.config();
  const mapConfig = serverConfig.get('map');

  const emsClient = new server.plugins.tile_map.ems_client.EMSClientV66({
    kbnVersion: serverConfig.get('pkg.version'),
    manifestServiceUrl: mapConfig.manifestServiceUrl,
    landingPageUrl: mapConfig.emsLandingPageUrl
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/data/ems`,
    handler: async (request) => {

      if (!request.query.id) {
        server.log('warning', 'Must supply id parameters to retrieve EMS file');
        return null;
      }

      const ems = await getEMSResources(licenseUid);

      const layer = ems.fileLayers.find(layer => layer.id === request.query.id);
      if (!layer) {
        return null;
      }

      const file = await fetch(layer.url);
      return await file.json();

    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/meta`,
    handler: async () => {

      let ems;
      try {
        ems = await getEMSResources(licenseUid);
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

  async function getEMSResources(licenseUid) {

    emsClient.addQueryParams({ license: licenseUid });
    const fileLayerObjs = await emsClient.getFileLayers();
    const tmsServicesObjs = await emsClient.getTMSServices();

    const fileLayers = fileLayerObjs.map(fileLayer => {
      //backfill to static settings
      const format = fileLayer.getDefaultFormatType();
      const meta = fileLayer.getDefaultFormatMeta();

      return {
        name: fileLayer.getDisplayName(),
        origin: fileLayer.getOrigin(),
        id: fileLayer.getId(),
        created_at: fileLayer.getCreatedAt(),
        attribution: fileLayer.getHTMLAttribution(),
        attributions: fileLayer.getAttributions(),
        fields: fileLayer.getFieldsInLanguage(),
        url: fileLayer.getDefaultFormatUrl(),
        format: format, //legacy: format and meta are split up
        meta: meta //legacy, format and meta are split up
      };
    });

    const tmsServices = tmsServicesObjs.map(tmsService => {
      return {
        origin: tmsService.getOrigin(),
        id: tmsService.getId(),
        minZoom: tmsService.getMinZoom(),
        maxZoom: tmsService.getMaxZoom(),
        attribution: tmsService.getHTMLAttribution(),
        attributionMarkdown: tmsService.getMarkdownAttribution(),
        url: tmsService.getUrlTemplate()
      };
    });

    return { fileLayers, tmsServices };
  }
}
