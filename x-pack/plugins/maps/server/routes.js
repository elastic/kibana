/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMS_APP_NAME,
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
  EMS_SPRITES_PATH,
  INDEX_SETTINGS_API_PATH,
  FONTS_API_PATH,
  API_ROOT_PATH,
} from '../common/constants';
import { EMSClient } from '@elastic/ems-client';
import fetch from 'node-fetch';
import { i18n } from '@kbn/i18n';
import { getIndexPatternSettings } from './lib/get_index_pattern_settings';
import { schema } from '@kbn/config-schema';
import fs from 'fs';
import path from 'path';
import { initMVTRoutes } from './mvt/mvt_routes';
import { initIndexingRoutes } from './data_indexing/indexing_routes';

const EMPTY_EMS_CLIENT = {
  async getFileLayers() {
    return [];
  },
  async getTMSServices() {
    return [];
  },
  async getDefaultFileManifest() {
    return null;
  },
  async getDefaultTMSManifest() {
    return null;
  },
  addQueryParams() {},
};

export async function initRoutes(core, getLicenseId, emsSettings, kbnVersion, logger) {
  let emsClient;
  let lastLicenseId;
  const router = core.http.createRouter();
  const [, { data: dataPlugin }] = await core.getStartServices();

  function getEMSClient() {
    const currentLicenseId = getLicenseId();
    if (emsClient && emsSettings.isEMSEnabled() && lastLicenseId === currentLicenseId) {
      return emsClient;
    }

    lastLicenseId = currentLicenseId;
    if (emsSettings.isIncludeElasticMapsService()) {
      emsClient = new EMSClient({
        language: i18n.getLocale(),
        appVersion: kbnVersion,
        appName: EMS_APP_NAME,
        fileApiUrl: emsSettings.getEMSFileApiUrl(),
        tileApiUrl: emsSettings.getEMSTileApiUrl(),
        landingPageUrl: emsSettings.getEMSLandingPageUrl(),
        fetchFunction: fetch,
      });
      emsClient.addQueryParams({
        license: currentLicenseId,
        is_kibana_proxy: '1', // identifies this is proxied request from kibana
      });
      return emsClient;
    } else {
      return EMPTY_EMS_CLIENT;
    }
  }

  router.get(
    {
      path: `${API_ROOT_PATH}/${EMS_FILES_API_PATH}/${EMS_FILES_DEFAULT_JSON_PATH}`,
      validate: {
        query: schema.object({
          id: schema.maybe(schema.string()),
          elastic_tile_service_tos: schema.maybe(schema.string()),
          my_app_name: schema.maybe(schema.string()),
          my_app_version: schema.maybe(schema.string()),
          license: schema.maybe(schema.string()),
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

      const fileLayers = await getEMSClient().getFileLayers();
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
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_TILES_RASTER_TILE_PATH}`,
      validate: false,
    },
    async (context, request, response) => {
      if (!checkEMSProxyEnabled()) {
        return response.badRequest('map.proxyElasticMapsServiceInMaps disabled');
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

      const tmsServices = await getEMSClient().getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }

      const urlTemplate = await tmsService.getUrlTemplate();
      const url = urlTemplate
        .replace('{x}', request.query.x)
        .replace('{y}', request.query.y)
        .replace('{z}', request.query.z);

      return await proxyResource({ url, contentType: 'image/png' }, response);
    }
  );

  router.get(
    {
      path: `${API_ROOT_PATH}/${EMS_FILES_CATALOGUE_PATH}/{emsVersion}/manifest`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const file = await getEMSClient().getDefaultFileManifest(); //need raw manifest
      const fileLayers = await getEMSClient().getFileLayers();

      const layers = file.layers.map((layerJson) => {
        const newLayerJson = { ...layerJson };
        const id = encodeURIComponent(layerJson.layer_id);

        const fileLayer = fileLayers.find((fileLayer) => fileLayer.getId() === layerJson.layer_id);
        const defaultFormat = layerJson.formats.find(
          (format) => format.type === fileLayer.getDefaultFormatType()
        );

        const newUrl = `${EMS_FILES_DEFAULT_JSON_PATH}?id=${id}`;

        //Only proxy default-format. Others are unused in Maps-app
        newLayerJson.formats = [
          {
            ...defaultFormat,
            url: newUrl,
          },
        ];
        return newLayerJson;
      });
      //rewrite
      return ok({
        body: {
          layers,
        },
      });
    }
  );

  router.get(
    {
      path: `${API_ROOT_PATH}/${EMS_TILES_CATALOGUE_PATH}/{emsVersion}/manifest`,
      validate: false,
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const tilesManifest = await getEMSClient().getDefaultTMSManifest();
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
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_TILES_RASTER_STYLE_PATH}`,
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

      const tmsServices = await getEMSClient().getTMSServices();
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
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_TILES_VECTOR_STYLE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.string(),
          elastic_tile_service_tos: schema.maybe(schema.string()),
          my_app_name: schema.maybe(schema.string()),
          my_app_version: schema.maybe(schema.string()),
          license: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const tmsServices = await getEMSClient().getTMSServices();
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
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_TILES_VECTOR_SOURCE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.string(),
          sourceId: schema.maybe(schema.string()),
          elastic_tile_service_tos: schema.maybe(schema.string()),
          my_app_name: schema.maybe(schema.string()),
          my_app_version: schema.maybe(schema.string()),
          license: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, { ok, badRequest }) => {
      if (!checkEMSProxyEnabled()) {
        return badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const tmsServices = await getEMSClient().getTMSServices();
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
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_TILES_VECTOR_TILE_PATH}`,
      validate: {
        query: schema.object({
          id: schema.string(),
          sourceId: schema.string(),
          x: schema.number(),
          y: schema.number(),
          z: schema.number(),
          elastic_tile_service_tos: schema.maybe(schema.string()),
          my_app_name: schema.maybe(schema.string()),
          my_app_version: schema.maybe(schema.string()),
          license: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      if (!checkEMSProxyEnabled()) {
        return response.badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const tmsServices = await getEMSClient().getTMSServices();
      const tmsService = tmsServices.find((layer) => layer.getId() === request.query.id);
      if (!tmsService) {
        return null;
      }

      const urlTemplate = await tmsService.getUrlTemplateForVector(request.query.sourceId);
      const url = urlTemplate
        .replace('{x}', request.query.x)
        .replace('{y}', request.query.y)
        .replace('{z}', request.query.z);

      return await proxyResource({ url }, response);
    }
  );

  router.get(
    {
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_GLYPHS_PATH}/{fontstack}/{range}`,
      validate: {
        params: schema.object({
          fontstack: schema.string(),
          range: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      if (!checkEMSProxyEnabled()) {
        return response.badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }
      const url = emsSettings
        .getEMSFontLibraryUrl()
        .replace('{fontstack}', request.params.fontstack)
        .replace('{range}', request.params.range);

      return await proxyResource({ url }, response);
    }
  );

  router.get(
    {
      path: `${API_ROOT_PATH}/${EMS_TILES_API_PATH}/${EMS_SPRITES_PATH}/{id}/sprite{scaling?}.{extension}`,
      validate: {
        query: schema.object({
          elastic_tile_service_tos: schema.maybe(schema.string()),
          my_app_name: schema.maybe(schema.string()),
          my_app_version: schema.maybe(schema.string()),
          license: schema.maybe(schema.string()),
        }),
        params: schema.object({
          id: schema.string(),
          scaling: schema.maybe(schema.string()),
          extension: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      if (!checkEMSProxyEnabled()) {
        return response.badRequest('map.proxyElasticMapsServiceInMaps disabled');
      }

      const tmsServices = await getEMSClient().getTMSServices();
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
        response
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
      const range = path.normalize(request.params.range);
      return range.startsWith('..')
        ? response.notFound()
        : new Promise((resolve) => {
            const fontPath = path.join(__dirname, 'fonts', 'open_sans', `${range}.pbf`);
            fs.readFile(fontPath, (error, data) => {
              if (error) {
                resolve(response.notFound());
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
        const resp = await context.core.elasticsearch.client.asCurrentUser.indices.getSettings({
          index: query.indexPatternTitle,
        });
        const indexPatternSettings = getIndexPatternSettings(resp.body);
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
    const proxyEMSInMaps = emsSettings.isProxyElasticMapsServiceInMaps();
    if (!proxyEMSInMaps) {
      logger.warn(
        `Cannot load content from EMS when map.proxyElasticMapsServiceInMaps is turned off`
      );
    }
    return proxyEMSInMaps;
  }

  async function proxyResource({ url, contentType }, response) {
    try {
      const resource = await fetch(url);
      const arrayBuffer = await resource.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return response.ok({
        body: buffer,
        headers: {
          'content-disposition': 'inline',
          'content-length': buffer.length,
          ...(contentType ? { 'Content-type': contentType } : {}),
        },
      });
    } catch (e) {
      logger.warn(`Cannot connect to EMS for resource, error: ${e.message}`);
      return response.badRequest(`Cannot connect to EMS`);
    }
  }

  initMVTRoutes({ router, logger });
  initIndexingRoutes({ router, logger, dataPlugin });
}
