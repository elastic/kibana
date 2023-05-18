/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  ESTermSourceDescriptor,
  VectorSourceRequestMeta,
} from '../../../../../common/descriptor_types';
import { PropertiesMap } from '../../../../../common/elasticsearch_util';
import { isValidStringConfig } from '../../../util/valid_string_config';
import { ITermJoinSource } from '../types';
import type { IESAggSource } from '../../es_agg_source';
import { IField } from '../../../fields/field';
import { mergeExecutionContext } from '../../execution_context_utils';
import { isTermSourceComplete } from './is_term_source_complete';

const TERMS_AGG_NAME = 'join';
const TERMS_BUCKET_KEYS_TO_IGNORE = ['key', 'doc_count'];

type ESTermSourceSyncMeta = Pick<ESTermSourceDescriptor, 'indexPatternId' | 'size' | 'term'>;

export function extractPropertiesMap(rawEsData: any, countPropertyName: string): PropertiesMap {
  const propertiesMap: PropertiesMap = new Map<string, BucketProperties>();
  const buckets: any[] = rawEsData?.aggregations?.[TERMS_AGG_NAME]?.buckets ?? [];
  buckets.forEach((termBucket: any) => {
    const properties = extractPropertiesFromBucket(termBucket, TERMS_BUCKET_KEYS_TO_IGNORE);
    if (countPropertyName) {
      properties[countPropertyName] = termBucket.doc_count;
    }
    propertiesMap.set(termBucket.key.toString(), properties);
  });
  return propertiesMap;
}

export class ESTermSource extends AbstractESAggSource implements ITermJoinSource, IESAggSource {
  static type = SOURCE_TYPES.ES_TERM_SOURCE;

  static createDescriptor(descriptor: Partial<ESTermSourceDescriptor>): ESTermSourceDescriptor {
    const normalizedDescriptor = AbstractESAggSource.createDescriptor(descriptor);
    if (!isValidStringConfig(descriptor.term)) {
      throw new Error('Cannot create an ESTermSource without a term');
    }
    return {
      ...normalizedDescriptor,
      term: descriptor.term!,
      type: SOURCE_TYPES.ES_TERM_SOURCE,
    };
  }

  private readonly _termField: ESDocField;
  readonly _descriptor: ESTermSourceDescriptor;

  constructor(descriptor: Partial<ESTermSourceDescriptor>) {
    const sourceDescriptor = ESTermSource.createDescriptor(descriptor);
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
    this._termField = new ESDocField({
      fieldName: this._descriptor.term,
      source: this,
      origin: this.getOriginForField(),
    });
  }

  hasCompleteConfig(): boolean {
    return isTermSourceComplete(this._descriptor);
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

  async getAggLabel(aggType: AGG_TYPE, fieldLabel: string): Promise<string> {
    let indexPatternLabel: string | undefined;
    try {
      const indexPattern = await this.getIndexPattern();
      indexPatternLabel = indexPattern.getName();
    } catch (error) {
      indexPatternLabel = this._descriptor.indexPatternId;
    }
    return aggType === AGG_TYPE.COUNT
      ? i18n.translate('xpack.maps.source.esJoin.countLabel', {
          defaultMessage: `count of {indexPatternLabel}`,
          values: { indexPatternLabel },
        })
      : super.getAggLabel(aggType, fieldLabel);
  }

  async getPropertiesMap(
    requestMeta: VectorSourceRequestMeta,
    leftSourceName: string,
    leftFieldName: string,
    registerCancelCallback: (callback: () => void) => void,
    inspectorAdapters: Adapters
  ): Promise<PropertiesMap> {
    if (!this.hasCompleteConfig()) {
      return new Map<string, BucketProperties>();
    }

    const indexPattern = await this.getIndexPattern();
    const searchSource: ISearchSource = await this.makeSearchSource(requestMeta, 0);
    searchSource.setField('trackTotalHits', false);
    const termsField = getField(indexPattern, this._termField.getName());
    const termsAgg = {
      size: this._descriptor.size !== undefined ? this._descriptor.size : DEFAULT_MAX_BUCKETS_LIMIT,
    };
    searchSource.setField('aggs', {
      [TERMS_AGG_NAME]: {
        terms: addFieldToDSL(termsAgg, termsField),
        aggs: { ...this.getValueAggsDsl(indexPattern) },
      },
    });

    const rawEsData = await this._runEsQuery({
      requestId: this.getId(),
      requestName: i18n.translate('xpack.maps.termSource.requestName', {
        defaultMessage: '{leftSourceName} term join request',
        values: { leftSourceName },
      }),
      searchSource,
      registerCancelCallback,
      requestDescription: i18n.translate('xpack.maps.termSource.requestDescription', {
        defaultMessage: 'Get metrics from data view: {dataViewName}, term field: {termFieldName}',
        values: {
          dataViewName: indexPattern.getName(),
          termFieldName: this._termField.getName(),
        },
      }),
      searchSessionId: requestMeta.searchSessionId,
      executionContext: mergeExecutionContext(
        { description: 'es_term_source:terms' },
        requestMeta.executionContext
      ),
      requestsAdapter: inspectorAdapters.requests,
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

  getSyncMeta(): ESTermSourceSyncMeta {
    return {
      indexPatternId: this._descriptor.indexPatternId,
      size: this._descriptor.size,
      term: this._descriptor.term,
    };
  }

  getRightFields(): IField[] {
    return this.getMetricFields();
  }
}
