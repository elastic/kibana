/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { EMS_V2 } from '../common/ems_v2';
import { GIS_API_PATH } from '../common/constants';
import fetch from 'node-fetch';
import *  as elasticsearch from 'elasticsearch';
import _ from 'lodash';
import ZIPCODES from './junk/usa_zip_codes_v2';
// import WORLD_COUNTRIES from './junk/world_countries';

const ROOT = `/${GIS_API_PATH}`;

export function initRoutes(server) {

  const serverConfig = server.config();
  const mapConfig = serverConfig.get('map');
  const elasticsearchHost = serverConfig.get('elasticsearch.url');

  const emsV2 = new EMS_V2({
    kbnVersion: serverConfig.get('pkg.version'),
    license: server.plugins.xpack_main.info.license.getUid(),
    manifestServiceUrl: mapConfig.manifestServiceUrl,
    emsLandingPageUrl: mapConfig.emsLandingPageUrl
  });

  server.route({
    method: 'get',
    path: `${ROOT}/junk`,
    handler: async (request, reply) => {
      reply(ZIPCODES);
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/data/geohash_grid`,
    handler: async (request, reply) => {

      /**
       * todo: this is a placeholder information to get doc-counts for geohash_grid aggs.
       * The "real" implementation needs to handle any kind of metric.
       * e.g.: http://localhost:5601/wth/api/gis/data/geohash_grid?index_pattern=log*&geo_point_field=geo.coordinates
       */
      const indexPattern = request.query.index_pattern;
      const geoPointField = request.query.geo_point_field;
      let precision = parseInt(request.query.precision);
      if (isNaN(precision)) {
        precision = 1;
      }

      const maxLat = clamp(request.query.maxlat, -90, 90, 90);
      const minLat = clamp(request.query.minlat, -90, 90, -90);
      const maxLon = clamp(request.query.maxlon, -180, 180, 180);
      const minLon = clamp(request.query.minlon, -180, 180, -180);

      const boundingBox = {};
      boundingBox[geoPointField] = {
        "top_left": {
          "lat": maxLat,
          "lon": minLon
        },
        "bottom_right": {
          "lat": minLat,
          "lon": maxLon
        }
      };

      try {
        const esClient = new elasticsearch.Client({
          host: elasticsearchHost,
          log: 'info'
        });

        const resp = await esClient.search({
          index: indexPattern,
          body: {
            size: 0,
            "_source": {
              "excludes": []
            },
            "aggs": {
              "bbox": {
                "filter": {
                  "geo_bounding_box": boundingBox
                },
                "aggs": {
                  "grid": {
                    "geohash_grid": {
                      "field": geoPointField,
                      "precision": precision
                    },
                    "aggs": {
                      "centroid": {
                        "geo_centroid": {
                          "field": geoPointField
                        }
                      }
                    }
                  }
                }
              }
            },
          }
        });

        const featureCollection = convertEsResponseToGeoJsonFeatureCollection(resp, (aggregations) => {
          return aggregations.bbox.grid.buckets;
        }, (bucket) => {
          return bucket.centroid.location;
        });

        reply(featureCollection);

      } catch (e) {
        console.error(e);
        reply({ type: 'FeatureCollection', features: [] });
      }

    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/data/ems`,
    handler: async (request, reply) => {

      if (!request.query.name) {
        reply(null);
      }

      const ems = await getEMSResources();//todo: should do this lazily from emsV2 instance
      const layer = ems.fileLayers.find(layer => layer.name === request.query.name);
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

      let indexPatterns;
      try {
        indexPatterns = await getIndexPatterns(request);
      } catch (e) {
        console.error('Cannot connect to ES');
        console.error(e);
        indexPatterns = [];
      }

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
            regionmap: _.get(mapConfig, 'regionmap.layers', []),
            tilemap: _.get(mapConfig, 'tilemap', [])
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

    return indexPatterns.map(indexPattern => {
      const geoPointField = indexPattern.fields.find(field => {
        return field.type === 'geo_point';
      });
      indexPattern.isGeohashable = !!geoPointField;
      return indexPattern;
    });
  }


  async function getEMSResources() {
    const fileLayers = await emsV2.getFileLayers();
    const tmsServices = await emsV2.getTMSServices();
    return { fileLayers, tmsServices };
  }

  function convertEsResponseToGeoJsonFeatureCollection(esResponse, getBuckets, getCentroidForBucket) {

    const buckets = getBuckets(esResponse.aggregations);

    return {
      'type': 'FeatureCollection',
      features: buckets.map((bucket) => {
        const latlon = getCentroidForBucket(bucket);
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [latlon.lon, latlon.lat]
          },
          properties: {
            doc_count: bucket.doc_count,
            key: bucket.key
          }
        };

      })
    };
  }

  function clamp(numb, min, max, defaultValue) {
    const n = parseFloat(numb);
    if (!isNaN(n)) {
      return Math.min(max, Math.max(min, n));
    } else {
      return defaultValue;
    }
  }
}



