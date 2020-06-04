/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EMS_APP_NAME,
  EMS_CATALOGUE_PATH,
  EMS_FILES_API_PATH,
  EMS_FILES_CATALOGUE_PATH,
  EMS_FILES_DEFAULT_JSON_PATH,
  EMS_TILES_API_PATH,
  EMS_TILES_CATALOGUE_PATH,
  EMS_GLYPHS_PATH,
  EMS_TILES_RASTER_STYLE_PATH,
  EMS_TILES_RASTER_TILE_PATH,
  EMS_TILES_VECTOR_STYLE_PATH,
  EMS_TILES_VECTOR_SOURCE_PATH,
  EMS_TILES_VECTOR_TILE_PATH,
  GIS_API_PATH,
  EMS_SPRITES_PATH,
  INDEX_SETTINGS_API_PATH,
  FONTS_API_PATH,
} from '../common/constants';
import { EMSClient } from '@elastic/ems-client';
import fetch from 'node-fetch';
import { i18n } from '@kbn/i18n';
import { getIndexPatternSettings } from './lib/get_index_pattern_settings';
import { schema } from '@kbn/config-schema';
import fs from 'fs';
import path from 'path';

const ROOT = `/${GIS_API_PATH}`;

export function initRoutes(router, licenseUid, mapConfig, kbnVersion, logger) {
  let emsClient;
  if (mapConfig.includeElasticMapsService) {
    emsClient = new EMSClient({
      language: i18n.getLocale(),
      appVersion: kbnVersion,
      appName: EMS_APP_NAME,
      fileApiUrl: mapConfig.emsFileApiUrl,
      tileApiUrl: mapConfig.emsTileApiUrl,
      landingPageUrl: mapConfig.emsLandingPageUrl,
      fetchFunction: fetch,
    });
    emsClient.addQueryParams({ license: licenseUid });
  } else {
    emsClient = {
      async getFileLayers() {
        return [];
      },
      async getTMSServices() {
        return [];
      },
      async getMainManifest() {
        return null;
      },
      async getDefaultFileManifest() {
        return null;
      },
      async getDefaultTMSManifest() {
        return null;
      },
      addQueryParams() {},
    };
  }

  router.get(
    {
      path: `${ROOT}/${EMS_FILES_API_PATH}/${EMS_FILES_DEFAULT_JSON_PATH}`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
          x: schema.maybe(schema.number()),
          y: schema.maybe(schema.number()),
          z: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (!request.query.id) {
        logger.warn('Must supply id parameters to retrieve EMS file');
        return null;
      }

      const fileLayers = await emsClient.getFileLayers();
      const layer = fileLayers.find((layer) => layer.getId() === request.query.id);
      if (!layer) {
        return null;
      }

      try {
        const file = await fetch(layer.getDefaultFormatUrl());
        const fileJson = await file.json();
        return ok({ body: fileJson });
      } catch (e) {
        logger.warn(`Cannot connect to EMS for file, error: ${e.message}`);
        return badRequest(`Cannot connect to EMS`);
      }
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_TILES_RASTER_TILE_PATH}`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (
        !request.query.id ||
        typeof parseInt(request.query.x, 10) !== 'number' ||
        typeof parseInt(request.query.y, 10) !== 'number' ||
        typeof parseInt(request.query.z, 10) !== 'number'
      ) {
        logger.warn('Must supply id/x/y/z parameters to retrieve EMS raster tile');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }

      const urlTemplate = await tmsService.getUrlTemplate();
      const url = urlTemplate
        .replace('{x}', request.query.x)
        .replace('{y}', request.query.y)
        .replace('{z}', request.query.z);

      return await proxyResource({ url, contentType: 'image/png' }, { ok, badRequest });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_CATALOGUE_PATH}`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const main = await emsClient.getMainManifest();
      const proxiedManifest = {
        services: [],
      };

      //rewrite the urls to the submanifest
      const tileService = main.services.find((service) => service.type === 'tms');
      const fileService = main.services.find((service) => service.type === 'file');
      if (tileService) {
        proxiedManifest.services.push({
          ...tileService,
          manifest: `${GIS_API_PATH}/${EMS_TILES_CATALOGUE_PATH}`,
        });
      }
      if (fileService) {
        proxiedManifest.services.push({
          ...fileService,
          manifest: `${GIS_API_PATH}/${EMS_FILES_CATALOGUE_PATH}`,
        });
      }
      return ok({
        body: proxiedManifest,
      });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_FILES_CATALOGUE_PATH}/{emsVersion}/manifest`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const file = await emsClient.getDefaultFileManifest();
      const layers = file.layers.map((layer) => {
        const newLayer = { ...layer };
        const id = encodeURIComponent(layer.layer_id);
        const newUrl = `${EMS_FILES_DEFAULT_JSON_PATH}?id=${id}`;
        newLayer.formats = [
          {
            ...layer.formats[0],
            url: newUrl,
          },
        ];
        return newLayer;
      });
      //rewrite
      return ok({
        body: layers,
      });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_CATALOGUE_PATH}/{emsVersion}/manifest`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const tilesManifest = await emsClient.getDefaultTMSManifest();
      const newServices = tilesManifest.services.map((service) => {
        const newService = {
          ...service,
        };

        newService.formats = [];
        const rasterFormats = service.formats.filter((format) => format.format === 'raster');
        if (rasterFormats.length) {
          const newUrl = `${EMS_TILES_RASTER_STYLE_PATH}?id=${service.id}`;
          newService.formats.push({
            ...rasterFormats[0],
            url: newUrl,
          });
        }
        const vectorFormats = service.formats.filter((format) => format.format === 'vector');
        if (vectorFormats.length) {
          const newUrl = `${EMS_TILES_VECTOR_STYLE_PATH}?id=${service.id}`;
          newService.formats.push({
            ...vectorFormats[0],
            url: newUrl,
          });
        }
        return newService;
      });

      return ok({
        body: {
          services: newServices,
        },
      });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_TILES_RASTER_STYLE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (!request.query.id) {
        logger.warn('Must supply id parameter to retrieve EMS raster style');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }
      const style = await tmsService.getDefaultRasterStyle();

      const newUrl = `${EMS_TILES_RASTER_TILE_PATH}?id=${request.query.id}&x={x}&y={y}&z={z}`;
      return ok({
        body: {
          ...style,
          tiles: [newUrl],
        },
      });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_TILES_VECTOR_STYLE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (!request.query.id) {
        logger.warn('Must supply id parameter to retrieve EMS vector style');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }

      const vectorStyle = await tmsService.getVectorStyleSheetRaw();
      const newSources = {};
      for (const sourceId in vectorStyle.sources) {
        if (vectorStyle.sources.hasOwnProperty(sourceId)) {
          newSources[sourceId] = {
            type: 'vector',
            url: `${EMS_TILES_VECTOR_SOURCE_PATH}?id=${request.query.id}&sourceId=${sourceId}`,
          };
        }
      }

      const spritePath = `${EMS_SPRITES_PATH}/${request.query.id}/sprite`;

      return ok({
        body: {
          ...vectorStyle,
          glyphs: `${EMS_GLYPHS_PATH}/{fontstack}/{range}`,
          sprite: spritePath,
          sources: newSources,
        },
      });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_TILES_VECTOR_SOURCE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
          sourceId: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (!request.query.id || !request.query.sourceId) {
        logger.warn('Must supply id and sourceId parameter to retrieve EMS vector source');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }

      const vectorStyle = await tmsService.getVectorStyleSheet();
      const sourceManifest = vectorStyle.sources[request.query.sourceId];

      const newUrl = `${EMS_TILES_VECTOR_TILE_PATH}?id=${request.query.id}&sourceId=${request.query.sourceId}&x={x}&y={y}&z={z}`;
      return ok({
        body: {
          ...sourceManifest,
          tiles: [newUrl],
        },
      });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_TILES_VECTOR_TILE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
          sourceId: schema.maybe(schema.string()),
          x: schema.maybe(schema.number()),
          y: schema.maybe(schema.number()),
          z: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (
        !request.query.id ||
        !request.query.sourceId ||
        typeof parseInt(request.query.x, 10) !== 'number' ||
        typeof parseInt(request.query.y, 10) !== 'number' ||
        typeof parseInt(request.query.z, 10) !== 'number'
      ) {
        logger.warn('Must supply id/sourceId/x/y/z parameters to retrieve EMS vector tile');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }

      const urlTemplate = await tmsService.getUrlTemplateForVector(request.query.sourceId);
      const url = urlTemplate
        .replace('{x}', request.query.x)
        .replace('{y}', request.query.y)
        .replace('{z}', request.query.z);

      return await proxyResource({ url }, { ok, badRequest });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_GLYPHS_PATH}/{fontstack}/{range}`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }
      const url = mapConfig.emsFontLibraryUrl
        .replace('{fontstack}', request.params.fontstack)
        .replace('{range}', request.params.range);

      return await proxyResource({ url }, { ok, badRequest });
    }
  );

  router.get(
    {
      path: `${ROOT}/${EMS_TILES_API_PATH}/${EMS_SPRITES_PATH}/{id}/sprite{scaling?}.{extension}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      if (!request.params.id) {
        logger.warn('Must supply id parameter to retrieve EMS vector source sprite');
        return null;
      }

      const tmsServices = await emsClient.getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.params.id);
      if (!tmsService) {
        return null;
      }

      let proxyPathUrl;
      const isRetina = request.params.scaling === '@2x';
      if (request.params.extension === 'json') {
        proxyPathUrl = await tmsService.getSpriteSheetJsonPath(isRetina);
      } else if (request.params.extension === 'png') {
        proxyPathUrl = await tmsService.getSpriteSheetPngPath(isRetina);
      } else {
        logger.warn(`Must have png or json extension for spritesheet`);
        return null;
      }

      return await proxyResource(
        {
          url: proxyPathUrl,
          contentType: request.params.extension === 'png' ? 'image/png' : '',
        },
        { ok, badRequest }
      );
    }
  );

  router.get(
    {
      path: `/${FONTS_API_PATH}/{fontstack}/{range}`,
      validate: {
        params: schema.object({
          fontstack: schema.string(),
          range: schema.string(),
        }),
      },
    },
    (context, request, response) => {
      return new Promise((resolve, reject) => {
        const santizedRange = path.normalize(request.params.range);
        const fontPath = path.join(__dirname, 'fonts', 'open_sans', `${santizedRange}.pbf`);
        fs.readFile(fontPath, (error, data) => {
          if (error) {
            reject(
              response.custom({
                statusCode: 404,
              })
            );
          } else {
            resolve(
              response.ok({
                body: data,
              })
            );
          }
        });
      });
    }
  );

  router.get(
    {
      path: `/${INDEX_SETTINGS_API_PATH}`,
      validate: {
        query: schema.object({
          indexPatternTitle: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      const { query } = request;

      if (!query.indexPatternTitle) {
        logger.warn(`Required query parameter 'indexPatternTitle' not provided.`);
        return response.custom({
          body: `Required query parameter 'indexPatternTitle' not provided.`,
          statusCode: 400,
        });
      }

      try {
        const resp = await context.core.elasticsearch.legacy.client.callAsCurrentUser(
          'indices.getSettings',
          {
            index: query.indexPatternTitle,
          }
        );
        const indexPatternSettings = getIndexPatternSettings(resp);
        return response.ok({
          body: indexPatternSettings,
        });
      } catch (error) {
        logger.warn(
          `Cannot load index settings for index pattern '${query.indexPatternTitle}', error: ${error.message}.`
        );
        response.custom({
          body: 'Error loading index settings',
          statusCode: 400,
        });
      }
    }
  );

  function checkEMSProxyEnabled() {
    const proxyEMSInMaps = mapConfig.proxyElasticMapsServiceInMaps;
    if (!proxyEMSInMaps) {
      logger.warn(
        `Cannot load content from EMS when map.proxyElasticMapsServiceInMaps is turned off`
      );
    }
    return proxyEMSInMaps;
  }

  async function proxyResource({ url, contentType }, { ok, badRequest }) {
    try {
      const resource = await fetch(url);
      const arrayBuffer = await resource.arrayBuffer();
      const bufferedResponse = Buffer.from(arrayBuffer);
      const headers = {
        'Content-Disposition': 'inline',
      };
      if (contentType) {
        headers['Content-type'] = contentType;
      }

      return ok({
        body: bufferedResponse,
        headers,
      });
    } catch (e) {
      logger.warn(`Cannot connect to EMS for resource, error: ${e.message}`);
      return badRequest(`Cannot connect to EMS`);
    }
  }
}
