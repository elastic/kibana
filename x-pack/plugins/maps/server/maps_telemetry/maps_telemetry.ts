/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  SavedObjectsClientContract,
  SavedObjectAttributes,
  SavedObjectAttribute,
} from 'kibana/server';
import { IFieldType, IIndexPattern } from 'src/plugins/data/public';
import { SOURCE_TYPES, ES_GEO_FIELD_TYPE, MAP_SAVED_OBJECT_TYPE } from '../../common/constants';
import { LayerDescriptor } from '../../common/descriptor_types';
import { MapSavedObject } from '../../common/map_saved_object_type';
// @ts-ignore
import { getInternalRepository } from '../kibana_server_services';
import { MapsConfigType } from '../../config';

interface IStats {
  [key: string]: {
    min: number;
    max: number;
    avg: number;
  };
}

interface ILayerTypeCount {
  [key: string]: number;
}

function getUniqueLayerCounts(layerCountsList: ILayerTypeCount[], mapsCount: number) {
  const uniqueLayerTypes = _.uniq(_.flatten(layerCountsList.map((lTypes) => Object.keys(lTypes))));

  return uniqueLayerTypes.reduce((accu: IStats, type: string) => {
    const typeCounts = layerCountsList.reduce(
      (tCountsAccu: number[], tCounts: ILayerTypeCount): number[] => {
        if (tCounts[type]) {
          tCountsAccu.push(tCounts[type]);
        }
        return tCountsAccu;
      },
      []
    );
    const typeCountsSum = _.sum(typeCounts);
    accu[type] = {
      min: typeCounts.length ? (_.min(typeCounts) as number) : 0,
      max: typeCounts.length ? (_.max(typeCounts) as number) : 0,
      avg: typeCountsSum ? typeCountsSum / mapsCount : 0,
    };
    return accu;
  }, {});
}

function getIndexPatternsWithGeoFieldCount(indexPatterns: IIndexPattern[]) {
  const fieldLists = indexPatterns.map((indexPattern) =>
    indexPattern.attributes && indexPattern.attributes.fields
      ? JSON.parse(indexPattern.attributes.fields)
      : []
  );

  const fieldListsWithGeoFields = fieldLists.filter((fields) =>
    fields.some(
      (field: IFieldType) =>
        field.type === ES_GEO_FIELD_TYPE.GEO_POINT || field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
    )
  );

  const fieldListsWithGeoPointFields = fieldLists.filter((fields) =>
    fields.some((field: IFieldType) => field.type === ES_GEO_FIELD_TYPE.GEO_POINT)
  );

  const fieldListsWithGeoShapeFields = fieldLists.filter((fields) =>
    fields.some((field: IFieldType) => field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE)
  );

  return {
    indexPatternsWithGeoFieldCount: fieldListsWithGeoFields.length,
    indexPatternsWithGeoPointFieldCount: fieldListsWithGeoPointFields.length,
    indexPatternsWithGeoShapeFieldCount: fieldListsWithGeoShapeFields.length,
  };
}

export function buildMapsTelemetry({
  mapSavedObjects,
  indexPatternSavedObjects,
  settings,
}: {
  mapSavedObjects: MapSavedObject[];
  indexPatternSavedObjects: IIndexPattern[];
  settings: SavedObjectAttribute;
}): SavedObjectAttributes {
  const layerLists = mapSavedObjects.map((savedMapObject) =>
    savedMapObject.attributes && savedMapObject.attributes.layerListJSON
      ? JSON.parse(savedMapObject.attributes.layerListJSON)
      : []
  );
  const mapsCount = layerLists.length;

  const dataSourcesCount = layerLists.map((lList) => {
    // todo: not every source-descriptor has an id
    // @ts-ignore
    const sourceIdList = lList.map((layer: LayerDescriptor) => layer.sourceDescriptor.id);
    return _.uniq(sourceIdList).length;
  });

  const layersCount = layerLists.map((lList) => lList.length);
  const layerTypesCount = layerLists.map((lList) => _.countBy(lList, 'type'));

  // Count of EMS Vector layers used
  const emsLayersCount = layerLists.map((lList) =>
    _(lList)
      .countBy((layer: LayerDescriptor) => {
        const isEmsFile = _.get(layer, 'sourceDescriptor.type') === SOURCE_TYPES.EMS_FILE;
        return isEmsFile && _.get(layer, 'sourceDescriptor.id');
      })
      .pickBy((val, key) => key !== 'false')
      .value()
  ) as ILayerTypeCount[];

  const dataSourcesCountSum = _.sum(dataSourcesCount);
  const layersCountSum = _.sum(layersCount);

  const {
    indexPatternsWithGeoFieldCount,
    indexPatternsWithGeoPointFieldCount,
    indexPatternsWithGeoShapeFieldCount,
  } = getIndexPatternsWithGeoFieldCount(indexPatternSavedObjects);
  return {
    settings,
    indexPatternsWithGeoFieldCount,
    indexPatternsWithGeoPointFieldCount,
    indexPatternsWithGeoShapeFieldCount,
    // Total count of maps
    mapsTotalCount: mapsCount,
    // Time of capture
    timeCaptured: new Date().toISOString(),
    attributesPerMap: {
      // Count of data sources per map
      dataSourcesCount: {
        min: dataSourcesCount.length ? _.min(dataSourcesCount) : 0,
        max: dataSourcesCount.length ? _.max(dataSourcesCount) : 0,
        avg: dataSourcesCountSum ? layersCountSum / mapsCount : 0,
      },
      // Total count of layers per map
      layersCount: {
        min: layersCount.length ? _.min(layersCount) : 0,
        max: layersCount.length ? _.max(layersCount) : 0,
        avg: layersCountSum ? layersCountSum / mapsCount : 0,
      },
      // Count of layers by type
      layerTypesCount: {
        ...getUniqueLayerCounts(layerTypesCount, mapsCount),
      },
      // Count of layer by EMS region
      emsVectorLayersCount: {
        ...getUniqueLayerCounts(emsLayersCount, mapsCount),
      },
    },
  };
}
async function getMapSavedObjects(savedObjectsClient: SavedObjectsClientContract) {
  const mapsSavedObjects = await savedObjectsClient.find({ type: MAP_SAVED_OBJECT_TYPE });
  return _.get(mapsSavedObjects, 'saved_objects', []);
}

async function getIndexPatternSavedObjects(savedObjectsClient: SavedObjectsClientContract) {
  const indexPatternSavedObjects = await savedObjectsClient.find({ type: 'index-pattern' });
  return _.get(indexPatternSavedObjects, 'saved_objects', []);
}

export async function getMapsTelemetry(config: MapsConfigType) {
  const savedObjectsClient = getInternalRepository();
  // @ts-ignore
  const mapSavedObjects: MapSavedObject[] = await getMapSavedObjects(savedObjectsClient);
  const indexPatternSavedObjects: IIndexPattern[] = (await getIndexPatternSavedObjects(
    // @ts-ignore
    savedObjectsClient
  )) as IIndexPattern[];
  const settings: SavedObjectAttribute = {
    showMapVisualizationTypes: config.showMapVisualizationTypes,
  };
  return buildMapsTelemetry({ mapSavedObjects, indexPatternSavedObjects, settings });
}
