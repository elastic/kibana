/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { SavedObject } from 'kibana/server';
import type { IndexPatternField } from 'src/plugins/data/public';
import {
  ES_GEO_FIELD_TYPE,
  LAYER_TYPE,
  MAP_SAVED_OBJECT_TYPE,
  SCALING_TYPES,
  SOURCE_TYPES,
} from '../../common/constants';
import {
  ESGeoGridSourceDescriptor,
  ESSearchSourceDescriptor,
  LayerDescriptor,
} from '../../common/descriptor_types';
import { MapSavedObjectAttributes } from '../../common/map_saved_object_type';
import {
  getElasticsearch,
  getIndexPatternsServiceFactory,
  getSavedObjectClient,
} from '../kibana_server_services';
import { injectReferences } from '././../../common/migrations/references';
import { SavedObjectsClient } from '../../../../../src/core/server';
import { MapStats, MapStatsCollector } from './map_stats';

async function getIndexPatternsService() {
  const factory = getIndexPatternsServiceFactory();
  return factory(
    new SavedObjectsClient(getSavedObjectClient()),
    getElasticsearch().client.asInternalUser
  );
}

export interface GeoIndexPatternsUsage {
  indexPatternsWithGeoFieldCount?: number;
  indexPatternsWithGeoPointFieldCount?: number;
  indexPatternsWithGeoShapeFieldCount?: number;
  geoShapeAggLayersCount?: number;
}

export type MapsUsage = MapStats & GeoIndexPatternsUsage;

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
  return indexPattern.fields.some(
    (fieldDescriptor: IndexPatternField) =>
      fieldDescriptor.name && fieldDescriptor.name === geoField!
  );
}

async function isGeoShapeAggLayer(layer: LayerDescriptor): Promise<boolean> {
  if (layer.sourceDescriptor === null) {
    return false;
  }

  if (
    layer.type !== LAYER_TYPE.GEOJSON_VECTOR &&
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

async function filterIndexPatternsByField(fields: string[]) {
  const indexPatternsService = await getIndexPatternsService();
  const indexPatternIds = await indexPatternsService.getIds(true);
  let numIndexPatternsContainingField = 0;
  await Promise.all(
    indexPatternIds.map(async (indexPatternId: string) => {
      const indexPattern = await indexPatternsService.get(indexPatternId);
      const containsField = fields.some((field: string) =>
        indexPattern.fields.some(
          (fieldDescriptor) => fieldDescriptor.esTypes && fieldDescriptor.esTypes.includes(field)
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

async function findMaps(
  callback: (savedObject: SavedObject<MapSavedObjectAttributes>) => void
) {
  const savedObjectsClient = getSavedObjectClient();

  let currentPage = 1;
  let page = 0;
  let perPage = 0;
  let total = 0;

  do {
    const results = await savedObjectsClient.find<MapSavedObjectAttributes>({
      type: MAP_SAVED_OBJECT_TYPE,
      page: currentPage++,
    });
    perPage = results.per_page;
    page = results.page;
    total = results.page;
    results.saved_objects.forEach(savedObject => {
      callback(savedObject);
    });
  } while (page * perPage < total);
}

export async function getMapsTelemetry(): Promise<MapsUsage> {
  const mapStatsCollector = new MapStatsCollector();
  const layerLists: LayerDescriptor[][] = [];
  await findMaps(
    (savedObject) => {
      mapStatsCollector.push(savedObject.attributes);

      const savedObjectWithIndexPatternIds = {
        ...savedObject,
        ...injectReferences(savedObject),
      };
      layerLists.push(savedObjectWithIndexPatternIds);
    }
  );
  
  // Incrementally harvest index pattern saved objects telemetry
  const indexPatternsTelemetry = await buildMapsIndexPatternsTelemetry(layerLists);

  return {
    ...indexPatternsTelemetry,
    ...mapStatsCollector.getStats(),
  };
}
