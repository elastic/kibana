/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

function getSavedObjectsClient(server, callCluster) {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const internalRepository = getSavedObjectsRepository(callCluster);
  return new SavedObjectsClient(internalRepository);
}

function getUniqueLayerCounts(layerCountsList, mapsCount) {
  const uniqueLayerTypes = _.uniq(_.flatten(
    layerCountsList.map(lTypes => Object.keys(lTypes))));

  return uniqueLayerTypes.reduce((accu, type) => {
    const typeCounts = layerCountsList.reduce((accu, tCounts) => {
      tCounts[type] && accu.push(tCounts[type]);
      return accu;
    }, []);
    accu[type] = {
      min: _.min(typeCounts),
      max: _.max(typeCounts),
      avg: _.sum(typeCounts) / mapsCount
    };
    return accu;
  }, {});
}

async function buildMapsTelemetry(savedObjectsClient) {
  const gisMapsSavedObject = await savedObjectsClient.find({
    type: 'gis-map'
  });

  const mapLayerLists = _.get(gisMapsSavedObject, 'saved_objects')
    .map(savedMapObject => JSON.parse(savedMapObject.attributes.layerListJSON));
  const dataSourcesCount = mapLayerLists.map(lList => {
    const sourceIdList = lList.map(layer => layer.sourceDescriptor.id);
    return _.uniq(sourceIdList).length;
  });
  const layersCount = mapLayerLists.map(lList => lList.length);
  const layerTypesCount = mapLayerLists.map(lList => _.countBy(lList, 'type'));
  const emsLayersCount = mapLayerLists.map(lList => _(lList)
    .countBy(layer => {
      const isEmsFile = _.get(layer, 'sourceDescriptor.type') === 'EMS_FILE';
      return isEmsFile && _.get(layer, 'sourceDescriptor.id');
    })
    .pick((val, key) => key !== 'false')
    .value());
  const mapsCount = mapLayerLists.length;

  const mapsTelem = {
    // Total count of maps
    mapsTotalCount: mapsCount,
    attributesPerMap: {
      // Count of data sources per map
      dataSourcesCount: {
        min: _.min(dataSourcesCount),
        max: _.max(dataSourcesCount),
        avg: _.sum(dataSourcesCount) / mapsCount
      },
      // Total count of layers per map
      layersCount: {
        min: _.min(layersCount),
        max: _.max(layersCount),
        avg: _.sum(layersCount) / mapsCount
      },
      // Count of layers by type
      layerTypesCount: {
        ...getUniqueLayerCounts(layerTypesCount, mapsCount)
      },
      // Count of layer by EMS region
      emsVectorLayersCount: {
        ...getUniqueLayerCounts(emsLayersCount, mapsCount)
      }
    }
  };
  return mapsTelem;
}

export async function getMapsTelemetry(server, callCluster) {
  const savedObjectsClient = getSavedObjectsClient(server, callCluster);
  const mapsTelemetry = await buildMapsTelemetry(savedObjectsClient);

  const telemetrySOClient = await savedObjectsClient.find({
    type: 'maps-telemetry'
  });
  const mapsTelemetrySavedObject = _.get(telemetrySOClient, 'saved_objects.[0]');

  return mapsTelemetrySavedObject
    ? mapsTelemetrySavedObject
    : await savedObjectsClient.create('maps-telemetry',
      mapsTelemetry, {
        id: 'maps-telemetry',
        overwrite: true,
      });
}