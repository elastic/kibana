/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { ISearchSource, Query } from 'src/plugins/data/public';
import {
  AGG_TYPE,
  DEFAULT_MAX_BUCKETS_LIMIT,
  FIELD_ORIGIN,
  SOURCE_TYPES,
} from '../../../../common/constants';
import { getJoinAggKey } from '../../../../common/get_agg_key';
import { ESDocField } from '../../fields/es_doc_field';
import { AbstractESAggSource } from '../es_agg_source';
import {
  getField,
  addFieldToDSL,
  extractPropertiesFromBucket,
  BucketProperties,
} from '../../../../common/elasticsearch_util';
import {
  ESTermSourceDescriptor,
  VectorJoinSourceRequestMeta,
} from '../../../../common/descriptor_types';
import { Adapters } from '../../../../../../../src/plugins/inspector/common/adapters';
import { PropertiesMap } from '../../../../common/elasticsearch_util';
import { isValidStringConfig } from '../../util/valid_string_config';

const TERMS_AGG_NAME = 'join';
const TERMS_BUCKET_KEYS_TO_IGNORE = ['key', 'doc_count'];

export function extractPropertiesMap(rawEsData: any, countPropertyName: string): PropertiesMap {
  const propertiesMap: PropertiesMap = new Map<string, BucketProperties>();
  const buckets: any[] = _.get(rawEsData, ['aggregations', TERMS_AGG_NAME, 'buckets'], []);
  buckets.forEach((termBucket: any) => {
    const properties = extractPropertiesFromBucket(termBucket, TERMS_BUCKET_KEYS_TO_IGNORE);
    if (countPropertyName) {
      properties[countPropertyName] = termBucket.doc_count;
    }
    propertiesMap.set(termBucket.key.toString(), properties);
  });
  return propertiesMap;
}

export class ESTermSource extends AbstractESAggSource {
  static type = SOURCE_TYPES.ES_TERM_SOURCE;

  static createDescriptor(descriptor: Partial<ESTermSourceDescriptor>): ESTermSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.term)) {
      throw new Error('Cannot create an ESTermSource without a term');
    }
    return {
      ...normalizedDescriptor,
      indexPatternTitle: descriptor.indexPatternTitle ? descriptor.indexPatternTitle : '',
      term: descriptor.term!,
      type: SOURCE_TYPES.ES_TERM_SOURCE,
    };
  }

  private readonly _termField: ESDocField;
  readonly _descriptor: ESTermSourceDescriptor;

  constructor(descriptor: ESTermSourceDescriptor, inspectorAdapters?: Adapters) {
    const sourceDescriptor = ESTermSource.createDescriptor(descriptor);
    super(sourceDescriptor, inspectorAdapters);
    this._descriptor = sourceDescriptor;
    this._termField = new ESDocField({
      fieldName: this._descriptor.term,
      source: this,
      origin: this.getOriginForField(),
    });
  }

  hasCompleteConfig() {
    return _.has(this._descriptor, 'indexPatternId') && _.has(this._descriptor, 'term');
  }

  getTermField(): ESDocField {
    return this._termField;
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

  getAggLabel(aggType: AGG_TYPE, fieldName: string) {
    return aggType === AGG_TYPE.COUNT
      ? i18n.translate('xpack.maps.source.esJoin.countLabel', {
          defaultMessage: `Count of {indexPatternTitle}`,
          values: { indexPatternTitle: this._descriptor.indexPatternTitle },
        })
      : super.getAggLabel(aggType, fieldName);
  }

  async getPropertiesMap(
    searchFilters: VectorJoinSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void
  ): Promise<PropertiesMap> {
    if (!this.hasCompleteConfig()) {
      return new Map<string, BucketProperties>();
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(searchFilters, 0);
    const termsField = getField(indexPattern, this._termField.getName());
    const termsAgg = { size: DEFAULT_MAX_BUCKETS_LIMIT };
    searchSource.setField('aggs', {
      [TERMS_AGG_NAME]: {
        terms: addFieldToDSL(termsAgg, termsField),
        aggs: { ...this.getValueAggsDsl(indexPattern) },
      },
    });

    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: `${this._descriptor.indexPatternTitle}.${this._termField.getName()}`,
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.source.esJoin.joinDescription', {
        defaultMessage: `Elasticsearch terms aggregation request, left source: {leftSource}, right source: {rightSource}`,
        values: {
          leftSource: `${leftSourceName}:${leftFieldName}`,
          rightSource: `${this._descriptor.indexPatternTitle}:${this._termField.getName()}`,
        },
      }),
    });

    const countPropertyName = this.getAggKey(AGG_TYPE.COUNT);
    return extractPropertiesMap(rawEsData, countPropertyName);
  }

  isFilterByMapBounds(): boolean {
    return false;
  }

  async getDisplayName(): Promise<string> {
    // no need to localize. this is never rendered.
    return `es_table ${this.getIndexPatternId()}`;
  }

  getFieldNames(): string[] {
    return this.getMetricFields().map((esAggMetricField) => esAggMetricField.getName());
  }
}
