/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IFieldType, IndexPattern } from 'src/plugins/data/public';
import { i18n } from '@kbn/i18n';
import { getIndexPatternService } from './kibana_services';
import { indexPatterns } from '../../../../src/plugins/data/public';
import { ES_GEO_FIELD_TYPE, ES_GEO_FIELD_TYPES } from '../common/constants';
import { getIsGoldPlus } from './licensed_features';

export function getGeoTileAggNotSupportedReason(field: IFieldType): string | null {
  if (!field.aggregatable) {
    return i18n.translate('xpack.maps.geoTileAgg.disabled.docValues', {
      defaultMessage:
        'Clustering requires aggregations. Enable aggregations by setting doc_values to true.',
    });
  }

  if (field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE && !getIsGoldPlus()) {
    return i18n.translate('xpack.maps.geoTileAgg.disabled.license', {
      defaultMessage: 'Geo_shape clustering requires a Gold license.',
    });
  }

  return null;
}

export async function getIndexPatternsFromIds(
  indexPatternIds: string[] = []
): Promise<IndexPattern[]> {
  const promises: IndexPattern[] = [];
  indexPatternIds.forEach(async (indexPatternId) => {
    try {
      // @ts-ignore
      promises.push(getIndexPatternService().get(indexPatternId));
    } catch (error) {
      // Unable to load index pattern, better to not throw error so map can render
      // Error will be surfaced by layer since it too will be unable to locate the index pattern
      return null;
    }
  });
  return await Promise.all(promises);
}

export function getTermsFields(fields: IFieldType[]): IFieldType[] {
  return fields.filter((field) => {
    return (
      field.aggregatable &&
      !indexPatterns.isNestedField(field) &&
      ['number', 'boolean', 'date', 'ip', 'string'].includes(field.type)
    );
  });
}

export function getAggregatableGeoFieldTypes(): string[] {
  const aggregatableFieldTypes = [ES_GEO_FIELD_TYPE.GEO_POINT];
  if (getIsGoldPlus()) {
    aggregatableFieldTypes.push(ES_GEO_FIELD_TYPE.GEO_SHAPE);
  }
  return aggregatableFieldTypes;
}

export function getGeoFields(fields: IFieldType[]): IFieldType[] {
  return fields.filter((field) => {
    return !indexPatterns.isNestedField(field) && ES_GEO_FIELD_TYPES.includes(field.type);
  });
}

export function getFieldsWithGeoTileAgg(fields: IFieldType[]): IFieldType[] {
  return fields.filter(supportsGeoTileAgg);
}

export function supportsGeoTileAgg(field?: IFieldType): boolean {
  return (
    !!field &&
    !!field.aggregatable &&
    !indexPatterns.isNestedField(field) &&
    getAggregatableGeoFieldTypes().includes(field.type)
  );
}

export function getSourceFields(fields: IFieldType[]): IFieldType[] {
  return fields.filter((field) => {
    // Multi fields are not stored in _source and only exist in index.
    const isMultiField = field.subType && field.subType.multi;
    return !isMultiField && !indexPatterns.isNestedField(field);
  });
}
