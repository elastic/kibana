/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection } from 'geojson';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
import { ISearchSource } from '@kbn/data-plugin/public';
import { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { AGG_TYPE, FIELD_ORIGIN, SOURCE_TYPES } from '../../../../../common/constants';
import { getJoinAggKey } from '../../../../../common/get_agg_key';
import { AbstractESAggSource } from '../../es_agg_source';
import type { BucketProperties } from '../../../../../common/elasticsearch_util';
import {
  ESDistanceSourceDescriptor,
  VectorSourceRequestMeta,
} from '../../../../../common/descriptor_types';
import { PropertiesMap } from '../../../../../common/elasticsearch_util';
import { isValidStringConfig } from '../../../util/valid_string_config';
import { IJoinSource } from '../types';
import type { IESAggSource } from '../../es_agg_source';
import { IField } from '../../../fields/field';
import { mergeExecutionContext } from '../../execution_context_utils';
import { processDistanceResponse } from './process_distance_response';
import { isSpatialSourceComplete } from '../is_spatial_source_complete';

export const DEFAULT_WITHIN_DISTANCE = 5;

type ESDistanceSourceSyncMeta = Pick<ESDistanceSourceDescriptor, 'distance' | 'geoField'>;

export class ESDistanceSource extends AbstractESAggSource implements IJoinSource, IESAggSource {
  static type = SOURCE_TYPES.ES_DISTANCE_SOURCE;

  static createDescriptor(
    descriptor: Partial<ESDistanceSourceDescriptor>
  ): ESDistanceSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.geoField)) {
      throw new Error('Cannot create an ESDistanceSource without a geoField property');
    }
    return {
      ...normalizedDescriptor,
      geoField: descriptor.geoField!,
      distance:
        typeof descriptor.distance === 'number' ? descriptor.distance : DEFAULT_WITHIN_DISTANCE,
      type: SOURCE_TYPES.ES_DISTANCE_SOURCE,
    };
  }

  readonly _descriptor: ESDistanceSourceDescriptor;

  constructor(descriptor: Partial<ESDistanceSourceDescriptor>) {
    const sourceDescriptor = ESDistanceSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }

  hasCompleteConfig(): boolean {
    return isSpatialSourceComplete(this._descriptor);
  }

  getOriginForField(): FIELD_ORIGIN {
    return FIELD_ORIGIN.JOIN;
  }

  getWhereQuery(): Query | undefined {
    return this._descriptor.whereQuery;
  }

  getAggKey(aggType: AGG_TYPE, fieldName?: string): string {
    return getJoinAggKey({
      aggType,
      aggFieldName: fieldName,
      rightSourceId: this._descriptor.id,
    });
  }

  async getPropertiesMap(
    requestMeta: VectorSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters,
    featureCollection?: FeatureCollection
  ): Promise<PropertiesMap> {
    if (featureCollection === undefined) {
      throw new Error(
        i18n.translate('xpack.maps.esDistanceSource.noFeatureCollectionMsg', {
          defaultMessage: `Unable to perform distance join, features not provided. To enable distance join, select 'Limit results' in 'Scaling'`,
        })
      );
    }

    if (!this.hasCompleteConfig()) {
      return new Map<string, BucketProperties>();
    }

    const distance = `${this._descriptor.distance}km`;
    let hasFilters = false;
    const filters: Record<string, unknown> = {};
    for (let i = 0; i < featureCollection.features.length; i++) {
      const feature = featureCollection.features[i];
      if (feature.geometry.type === 'Point' && feature?.properties?._id) {
        filters[feature.properties._id] = {
          geo_distance: {
            distance,
            [this._descriptor.geoField]: feature.geometry.coordinates,
          },
        };
        if (!hasFilters) {
          hasFilters = true;
        }
      }
    }

    if (!hasFilters) {
      return new Map<string, BucketProperties>();
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(requestMeta, 0);
    searchSource.setField('trackTotalHits', false);
    searchSource.setField('aggs', {
      distance: {
        filters: {
          filters,
        },
        aggs: this.getValueAggsDsl(indexPattern),
      },
    });
    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: i18n.translate('xpack.maps.distanceSource.requestName', {
        defaultMessage: '{leftSourceName} within distance join request',
        values: { leftSourceName },
      }),
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.distanceSource.requestDescription', {
        defaultMessage:
          'Get metrics from data view: {dataViewName}, geospatial field: {geoFieldName}',
        values: {
          dataViewName: indexPattern.getName(),
          geoFieldName: this._descriptor.geoField,
        },
      }),
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_distance_source:distance_join_request' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
    });

    return processDistanceResponse(rawEsData, this.getAggKey(AGG_TYPE.COUNT));
  }

  isFilterByMapBounds(): boolean {
    return false;
  }

  getFieldNames(): string[] {
    return this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName());
  }

  getSyncMeta(): ESDistanceSourceSyncMeta {
    return {
      distance: this._descriptor.distance,
      geoField: this._descriptor.geoField,
    };
  }

  getRightFields(): IField[] {
    return this.getMetricFields();
  }
}
