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
import {
  AGG_TYPE,
  DEFAULT_MAX_BUCKETS_LIMIT,
  FIELD_ORIGIN,
  SOURCE_TYPES,
} from '../../../../../common/constants';
import { getJoinAggKey } from '../../../../../common/get_agg_key';
import { ESDocField } from '../../../fields/es_doc_field';
import { AbstractESAggSource } from '../../es_agg_source';
import {
  getField,
  addFieldToDSL,
  extractPropertiesFromBucket,
  BucketProperties,
} from '../../../../../common/elasticsearch_util';
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

const TERMS_AGG_NAME = 'join';
const TERMS_BUCKET_KEYS_TO_IGNORE = ['key', 'doc_count'];

type ESDistanceSourceSyncMeta = Pick<ESDistanceSourceDescriptor, 'distance' | 'geoField'>;

export class ESDistanceSource extends AbstractESAggSource implements IJoinSource, IESAggSource {
  static type = SOURCE_TYPES.ES_DISTANCE_SOURCE;

  static createDescriptor(descriptor: Partial<ESDistanceSourceDescriptor>): ESDistanceSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.geoField)) {
      throw new Error('Cannot create an ESDistanceSource without a geoField property');
    }
    return {
      ...normalizedDescriptor,
      geoField: descriptor.geoField!,
      distance: typeof descriptor.distance === 'number' ? descriptor.distance : 5,
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
    return this._descriptor.indexPatternId !== undefined && this._descriptor.geoField !== undefined;
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
    featureCollection?: FeatureCollection,
  ): Promise<PropertiesMap> {
    console.log(featureCollection);
    if (!this.hasCompleteConfig()) {
      return new Map<string, BucketProperties>();
    }

    
    return new Map<string, BucketProperties>();
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
