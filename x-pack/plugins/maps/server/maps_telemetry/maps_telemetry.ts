/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { SavedObject } from 'kibana/server';
import { IFieldType, IndexPatternAttributes } from 'src/plugins/data/public';
import {
  ES_GEO_FIELD_TYPE,
  LAYER_TYPE,
  MAP_SAVED_OBJECT_TYPE,
  SCALING_TYPES,
  SOURCE_TYPES,
} from '../../common/constants';
import {
  AbstractSourceDescriptor,
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
} from '../../common/descriptor_types';
import { MapSavedObject, MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import { getInternalRepository } from '../kibana_server_services';
import { MapsConfigType } from '../../config';

interface Settings {
  showMapVisualizationTypes: boolean;
}

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

export interface GeoIndexPatternsUsage {
  indexPatternsWithGeoFieldCount?: number;
  indexPatternsWithGeoPointFieldCount?: number;
  indexPatternsWithGeoShapeFieldCount?: number;
  geoShapeAggLayersCount?: number;
}

export interface LayersStatsUsage {
  mapsTotalCount: number;
  timeCaptured: string;
  attributesPerMap: {
    dataSourcesCount: {
      min: number;
      max: number;
      avg: number;
    };
    layersCount: {
      min: number;
      max: number;
      avg: number;
    };
    layerTypesCount: IStats;
    emsVectorLayersCount: IStats;
  };
}

export interface MapsUsage extends LayersStatsUsage, GeoIndexPatternsUsage {
  settings: Settings;
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

function getIndexPatternsWithGeoFieldCount(
  indexPatterns: Array<SavedObject<IndexPatternAttributes>>
) {
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

function getEMSLayerCount(layerLists: LayerDescriptor[][]): ILayerTypeCount[] {
  return layerLists.map((layerList: LayerDescriptor[]) => {
    const emsLayers = layerList.filter((layer: LayerDescriptor) => {
      return (
        layer.sourceDescriptor !== null &&
        layer.sourceDescriptor.type === SOURCE_TYPES.EMS_FILE &&
        (layer.sourceDescriptor as AbstractSourceDescriptor).id
      );
    });
    const emsCountsById = _(emsLayers).countBy((layer: LayerDescriptor) => {
      return (layer.sourceDescriptor as AbstractSourceDescriptor).id;
    });

    const layerTypeCount = emsCountsById.value();
    return layerTypeCount as ILayerTypeCount;
  }) as ILayerTypeCount[];
}

function isFieldGeoShape(
  indexPatterns: Array<SavedObject<IndexPatternAttributes>>,
  indexPatternId: string,
  geoField: string | undefined
): boolean {
  if (!geoField) {
    return false;
  }

  const matchIndexPattern = indexPatterns.find(
    (indexPattern: SavedObject<IndexPatternAttributes>) => {
      return indexPattern.id === indexPatternId;
    }
  );

  if (!matchIndexPattern) {
    return false;
  }

  const fieldList: IFieldType[] =
    matchIndexPattern.attributes && matchIndexPattern.attributes.fields
      ? JSON.parse(matchIndexPattern.attributes.fields)
      : [];

  const matchField = fieldList.find((field: IFieldType) => {
    return field.name === geoField;
  });

  return !!matchField && matchField.type === ES_GEO_FIELD_TYPE.GEO_SHAPE;
}

function isGeoShapeAggLayer(
  indexPatterns: Array<SavedObject<IndexPatternAttributes>>,
  layer: LayerDescriptor
): boolean {
  if (layer.sourceDescriptor === null) {
    return false;
  }

  if (
    layer.type !== LAYER_TYPE.VECTOR &&
    layer.type !== LAYER_TYPE.BLENDED_VECTOR &&
    layer.type !== LAYER_TYPE.HEATMAP
  ) {
    return false;
  }

  const sourceDescriptor = layer.sourceDescriptor;
  if (sourceDescriptor.type === SOURCE_TYPES.ES_GEO_GRID) {
    return isFieldGeoShape(
      indexPatterns,
      (sourceDescriptor as ESGeoGridSourceDescriptor).indexPatternId,
      (sourceDescriptor as ESGeoGridSourceDescriptor).geoField
    );
  } else if (
    sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH &&
    (sourceDescriptor as ESSearchSourceDescriptor).scalingType === SCALING_TYPES.CLUSTERS
  ) {
    return isFieldGeoShape(
      indexPatterns,
      (sourceDescriptor as ESSearchSourceDescriptor).indexPatternId,
      (sourceDescriptor as ESSearchSourceDescriptor).geoField
    );
  } else {
    return false;
  }
}

function getGeoShapeAggCount(
  layerLists: LayerDescriptor[][],
  indexPatterns: Array<SavedObject<IndexPatternAttributes>>
): number {
  const countsPerMap: number[] = layerLists.map((layerList: LayerDescriptor[]) => {
    const geoShapeAggLayers = layerList.filter((layerDescriptor) => {
      return isGeoShapeAggLayer(indexPatterns, layerDescriptor);
    });
    return geoShapeAggLayers.length;
  });

  return _.sum(countsPerMap);
}

export function getLayerLists(mapSavedObjects: MapSavedObject[]): LayerDescriptor[][] {
  return mapSavedObjects.map((savedMapObject) => {
    const layerList =
      savedMapObject.attributes && savedMapObject.attributes.layerListJSON
        ? JSON.parse(savedMapObject.attributes.layerListJSON)
        : [];
    return layerList as LayerDescriptor[];
  });
}

export function buildMapsIndexPatternsTelemetry(
  indexPatternSavedObjects: Array<SavedObject<IndexPatternAttributes>>,
  layerLists: LayerDescriptor[][]
): GeoIndexPatternsUsage {
  const {
    indexPatternsWithGeoFieldCount,
    indexPatternsWithGeoPointFieldCount,
    indexPatternsWithGeoShapeFieldCount,
  } = getIndexPatternsWithGeoFieldCount(indexPatternSavedObjects);

  // Tracks whether user uses Gold+ only functionality
  const geoShapeAggLayersCount = getGeoShapeAggCount(layerLists, indexPatternSavedObjects);

  return {
    indexPatternsWithGeoFieldCount,
    indexPatternsWithGeoPointFieldCount,
    indexPatternsWithGeoShapeFieldCount,
    geoShapeAggLayersCount,
  };
}

export function buildMapsSavedObjectsTelemetry(layerLists: LayerDescriptor[][]): LayersStatsUsage {
  const mapsCount = layerLists.length;

  const dataSourcesCount = layerLists.map((layerList: LayerDescriptor[]) => {
    // todo: not every source-descriptor has an id
    // @ts-ignore
    const sourceIdList = layerList.map((layer: LayerDescriptor) => layer.sourceDescriptor.id);
    return _.uniq(sourceIdList).length;
  });

  const layersCount = layerLists.map((lList) => lList.length);
  const layerTypesCount = layerLists.map((lList) => _.countBy(lList, 'type'));

  // Count of EMS Vector layers used
  const emsLayersCount = getEMSLayerCount(layerLists);

  const dataSourcesCountSum = _.sum(dataSourcesCount);
  const layersCountSum = _.sum(layersCount);

  return {
    // Total count of maps
    mapsTotalCount: mapsCount,
    // Time of capture
    timeCaptured: new Date().toISOString(),
    attributesPerMap: {
      // Count of data sources per map
      dataSourcesCount: {
        min: dataSourcesCount.length ? _.min(dataSourcesCount)! : 0,
        max: dataSourcesCount.length ? _.max(dataSourcesCount)! : 0,
        avg: dataSourcesCountSum ? layersCountSum / mapsCount : 0,
      },
      // Total count of layers per map
      layersCount: {
        min: layersCount.length ? _.min(layersCount)! : 0,
        max: layersCount.length ? _.max(layersCount)! : 0,
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

export async function execTransformOverMultipleSavedObjectPages<T>(
  savedObjectType: string,
  transform: (savedObjects: Array<SavedObject<T>>) => void
) {
  const savedObjectsClient = getInternalRepository();

  let currentPage = 1;
  // Seed values
  let page = 0;
  let perPage = 0;
  let total = 0;
  let savedObjects = [];

  do {
    const savedObjectsFindResult = await savedObjectsClient.find<T>({
      type: savedObjectType,
      page: currentPage++,
    });
    ({ page, per_page: perPage, saved_objects: savedObjects, total } = savedObjectsFindResult);
    transform(savedObjects);
  } while (page * perPage < total);
}

export async function getMapsTelemetry(config: MapsConfigType): Promise<MapsUsage> {
  // Get layer descriptors for Maps saved objects. This is not set up
  // to be done incrementally (i.e. - per page) but minimally we at least
  // build a list of small footprint objects
  const layerLists: LayerDescriptor[][] = [];
  await execTransformOverMultipleSavedObjectPages<MapSavedObjectAttributes>(
    MAP_SAVED_OBJECT_TYPE,
    (savedObjects) => layerLists.push(...getLayerLists(savedObjects))
  );
  const savedObjectsTelemetry = buildMapsSavedObjectsTelemetry(layerLists);

  // Incrementally harvest index pattern saved objects telemetry
  const indexPatternsTelemetry = {};
  await execTransformOverMultipleSavedObjectPages<IndexPatternAttributes>(
    'index-pattern',
    (savedObjects) =>
      _.mergeWith(
        indexPatternsTelemetry,
        buildMapsIndexPatternsTelemetry(savedObjects, layerLists),
        (prevVal, currVal) => prevVal || 0 + currVal || 0 // Additive merge
      )
  );

  return {
    settings: {
      showMapVisualizationTypes: config.showMapVisualizationTypes,
    },
    ...indexPatternsTelemetry,
    ...savedObjectsTelemetry,
  };
}
