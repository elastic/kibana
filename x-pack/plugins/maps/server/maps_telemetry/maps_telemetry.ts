/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SavedObject } from 'kibana/server';
import { IFieldType } from 'src/plugins/data/public';
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
import { getIndexPatternsService, getInternalRepository } from '../kibana_server_services';
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

async function isFieldGeoShape(
  indexPatternId: string,
  geoField: string | undefined
): Promise<boolean> {
  if (!geoField || !indexPatternId) {
    return false;
  }
  const indexPatternsService = await getIndexPatternsService();
  const indexPattern = await indexPatternsService.get(indexPatternId);
  if (!indexPattern) {
    return false;
  }
  const fieldsForIndexPattern = await indexPatternsService.getFieldsForIndexPattern(indexPattern);
  return fieldsForIndexPattern.some(
    (fieldDescriptor: IFieldType) => fieldDescriptor.name && fieldDescriptor.name === geoField!
  );
}

async function isGeoShapeAggLayer(layer: LayerDescriptor): Promise<boolean> {
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
    return await isFieldGeoShape(
      (sourceDescriptor as ESGeoGridSourceDescriptor).indexPatternId,
      (sourceDescriptor as ESGeoGridSourceDescriptor).geoField
    );
  } else if (
    sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH &&
    (sourceDescriptor as ESSearchSourceDescriptor).scalingType === SCALING_TYPES.CLUSTERS
  ) {
    return await isFieldGeoShape(
      (sourceDescriptor as ESSearchSourceDescriptor).indexPatternId,
      (sourceDescriptor as ESSearchSourceDescriptor).geoField
    );
  } else {
    return false;
  }
}

async function getGeoShapeAggCount(layerLists: LayerDescriptor[][]): Promise<number> {
  const countsPerMap: number[] = await Promise.all(
    layerLists.map(async (layerList: LayerDescriptor[]) => {
      const boolIsAggLayerArr = await Promise.all(
        layerList.map(async (layerDescriptor) => await isGeoShapeAggLayer(layerDescriptor))
      );
      return boolIsAggLayerArr.filter((x) => x).length;
    })
  );
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

async function filterIndexPatternsByField(fields: string[]) {
  const indexPatternsService = await getIndexPatternsService();
  const indexPatternIds = await indexPatternsService.getIds(true);
  let numIndexPatternsContainingField = 0;
  await Promise.all(
    indexPatternIds.map(async (indexPatternId: string) => {
      const indexPattern = await indexPatternsService.get(indexPatternId);
      const fieldsForIndexPattern = await indexPatternsService.getFieldsForIndexPattern(
        indexPattern
      );
      const containsField = fields.some((field: string) =>
        fieldsForIndexPattern.some(
          (fieldDescriptor: IFieldType) =>
            fieldDescriptor.esTypes && fieldDescriptor.esTypes.includes(field)
        )
      );
      if (containsField) {
        numIndexPatternsContainingField++;
      }
    })
  );
  return numIndexPatternsContainingField;
}

export async function buildMapsIndexPatternsTelemetry(
  layerLists: LayerDescriptor[][]
): Promise<GeoIndexPatternsUsage> {
  const indexPatternsWithGeoField = await filterIndexPatternsByField([
    ES_GEO_FIELD_TYPE.GEO_POINT,
    ES_GEO_FIELD_TYPE.GEO_SHAPE,
  ]);
  const indexPatternsWithGeoPointField = await filterIndexPatternsByField([
    ES_GEO_FIELD_TYPE.GEO_POINT,
  ]);
  const indexPatternsWithGeoShapeField = await filterIndexPatternsByField([
    ES_GEO_FIELD_TYPE.GEO_SHAPE,
  ]);
  // Tracks whether user uses Gold+ only functionality
  const geoShapeAggLayersCount = await getGeoShapeAggCount(layerLists);

  return {
    indexPatternsWithGeoFieldCount: indexPatternsWithGeoField,
    indexPatternsWithGeoPointFieldCount: indexPatternsWithGeoPointField,
    indexPatternsWithGeoShapeFieldCount: indexPatternsWithGeoShapeField,
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
  const indexPatternsTelemetry = await buildMapsIndexPatternsTelemetry(layerLists);

  return {
    settings: {
      showMapVisualizationTypes: config.showMapVisualizationTypes,
    },
    ...indexPatternsTelemetry,
    ...savedObjectsTelemetry,
  };
}
