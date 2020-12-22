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

async function hasGeoShapeFields(indexPattern: SavedObject<IndexPatternAttributes>) {
  const fields = await getIndexPatternsService().getFieldsForIndexPattern(indexPattern);
  return fields.some(
    (field) => field.esTypes && field.esTypes.includes(ES_GEO_FIELD_TYPE.GEO_SHAPE)
  );
}

async function hasGeoPointFields(indexPattern: SavedObject<IndexPatternAttributes>) {
  const fields = await getIndexPatternsService().getFieldsForIndexPattern(indexPattern);
  const someFields = fields.some((field) => {
    const types = field.esTypes && field.esTypes.includes(ES_GEO_FIELD_TYPE.GEO_POINT);
    console.log(field);
    return types;
  });
  console.log(someFields);
  return someFields;
}

async function hasGeoFields(indexPattern: SavedObject<IndexPatternAttributes>) {
  const fields = await getIndexPatternsService().getFieldsForIndexPattern(indexPattern);
  const hasFields = fields.some(
    (field) =>
      field.esTypes &&
      (field.esTypes.includes(ES_GEO_FIELD_TYPE.GEO_POINT) ||
        field.esTypes.includes(ES_GEO_FIELD_TYPE.GEO_SHAPE))
  );
  return hasFields;
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

function isFieldGeoShape(indexPatternId: string, geoField: string | undefined): boolean {
  if (!geoField) {
    return false;
  }

  // const matchIndexPattern = getIndexPatternsService().get(indexPatternId);
  const matchIndexPattern = false;
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

function isGeoShapeAggLayer(layer: LayerDescriptor): boolean {
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
      (sourceDescriptor as ESGeoGridSourceDescriptor).indexPatternId,
      (sourceDescriptor as ESGeoGridSourceDescriptor).geoField
    );
  } else if (
    sourceDescriptor.type === SOURCE_TYPES.ES_SEARCH &&
    (sourceDescriptor as ESSearchSourceDescriptor).scalingType === SCALING_TYPES.CLUSTERS
  ) {
    return isFieldGeoShape(
      (sourceDescriptor as ESSearchSourceDescriptor).indexPatternId,
      (sourceDescriptor as ESSearchSourceDescriptor).geoField
    );
  } else {
    return false;
  }
}

function getGeoShapeAggCount(layerLists: LayerDescriptor[][]): number {
  const countsPerMap: number[] = layerLists.map((layerList: LayerDescriptor[]) => {
    const geoShapeAggLayers = layerList.filter((layerDescriptor) => {
      return isGeoShapeAggLayer(layerDescriptor);
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

export async function buildMapsIndexPatternsTelemetry(
  layerLists: LayerDescriptor[][]
): Promise<GeoIndexPatternsUsage> {
  console.log('######################## BEFORE MAPS TELEMETRY GET');
  const indexPatternsService = await getIndexPatternsService();
  // console.log('typeof', indexPatternsService);
  const indexPattern = await indexPatternsService.get('ff959d40-b880-11e8-a6d9-e546fe2bba5f');
  console.log('************************* AFTER MAPS TELEMETRY GET');
  console.log(JSON.stringify(indexPattern));
  console.log(indexPattern.fields.length);
  // console.log('*************************');
  // const fieldsForIndexPattern = await indexPatternsService.getFieldsForIndexPattern(indexPattern);
  // console.log(fieldsForIndexPattern);
  console.log('########################');

  const indexPatternsWithGeoField = await getIndexPatternsService().filter(
    ES_GEO_FIELD_TYPE.GEO_POINT,
    ['esTypes']
  );
  const indexPatternsWithGeoPointField = await getIndexPatternsService().filter(
    ES_GEO_FIELD_TYPE.GEO_POINT,
    ['esTypes']
  );
  const indexPatternsWithGeoShapeField = await getIndexPatternsService().filter(
    ES_GEO_FIELD_TYPE.GEO_SHAPE,
    ['esTypes']
  );

  // Tracks whether user uses Gold+ only functionality
  const geoShapeAggLayersCount = getGeoShapeAggCount(layerLists);

  return {
    indexPatternsWithGeoFieldCount: indexPatternsWithGeoField.length,
    indexPatternsWithGeoPointFieldCount: indexPatternsWithGeoPointField.length,
    indexPatternsWithGeoShapeFieldCount: indexPatternsWithGeoShapeField.length,
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
