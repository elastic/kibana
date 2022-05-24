/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexPatternField } from '@kbn/data-plugin/public';
import { indexPatterns } from '@kbn/data-plugin/public';
import { FIELD_ORIGIN } from '../../../common/constants';
import { ESTooltipProperty } from '../tooltips/es_tooltip_property';
import { ITooltipProperty, TooltipProperty } from '../tooltips/tooltip_property';
import { IField, AbstractField } from './field';
import { IESSource } from '../sources/es_source';
import { IVectorSource } from '../sources/vector_source';

export class ESDocField extends AbstractField implements IField {
  private readonly _source: IESSource;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IESSource;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin });
    this._source = source;
  }

  supportsFieldMetaFromEs(): boolean {
    return true;
  }

  supportsFieldMetaFromLocalData(): boolean {
    // Elasticsearch vector tile search API does not return meta tiles for documents
    return !this.getSource().isMvt();
  }

  canValueBeFormatted(): boolean {
    return true;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async _getIndexPatternField(): Promise<IndexPatternField | undefined> {
    const indexPattern = await this._source.getIndexPattern();
    const indexPatternField = indexPattern.fields.getByName(this.getName());
    return indexPatternField && indexPatterns.isNestedField(indexPatternField)
      ? undefined
      : indexPatternField;
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    const indexPattern = await this._source.getIndexPattern();
    const tooltipProperty = new TooltipProperty(this.getName(), await this.getLabel(), value);
    return new ESTooltipProperty(
      tooltipProperty,
      indexPattern,
      this as IField,
      this._source.getApplyGlobalQuery()
    );
  }

  async getDataType(): Promise<string> {
    const indexPatternField = await this._getIndexPatternField();
    return indexPatternField ? indexPatternField.type : '';
  }

  async getLabel(): Promise<string> {
    const indexPatternField = await this._getIndexPatternField();
    return indexPatternField && indexPatternField.displayName
      ? indexPatternField.displayName
      : super.getLabel();
  }

  async getExtendedStatsFieldMetaRequest(): Promise<unknown | null> {
    const indexPatternField = await this._getIndexPatternField();

    if (
      !indexPatternField ||
      (indexPatternField.type !== 'number' && indexPatternField.type !== 'date')
    ) {
      return null;
    }

    // TODO remove local typing once Kibana has figured out a core place for Elasticsearch aggregation request types
    // https://github.com/elastic/kibana/issues/60102
    const metricAggConfig: { script?: unknown; field?: string } = {};
    if (indexPatternField.scripted) {
      metricAggConfig.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      metricAggConfig.field = this.getName();
    }
    return {
      [`${this.getName()}_range`]: {
        extended_stats: metricAggConfig,
      },
    };
  }

  async getPercentilesFieldMetaRequest(percentiles: number[]): Promise<unknown | null> {
    const indexPatternField = await this._getIndexPatternField();

    if (!indexPatternField || indexPatternField.type !== 'number') {
      return null;
    }

    const metricAggConfig: { script?: unknown; field?: string; percents: number[] } = {
      percents: [0, ...percentiles],
    };
    if (indexPatternField.scripted) {
      metricAggConfig.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      metricAggConfig.field = this.getName();
    }
    return {
      [`${this.getName()}_percentiles`]: {
        percentiles: metricAggConfig,
      },
    };
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    const indexPatternField = await this._getIndexPatternField();
    if (!indexPatternField || size <= 0) {
      return null;
    }

    // TODO remove local typing once Kibana has figured out a core place for Elasticsearch aggregation request types
    // https://github.com/elastic/kibana/issues/60102
    const topTerms: { size: number; script?: unknown; field?: string } = {
      size: size - 1, // need additional color for the "other"-value
    };
    if (indexPatternField.scripted) {
      topTerms.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      topTerms.field = this.getName();
    }
    return {
      [`${this.getName()}_terms`]: {
        terms: topTerms,
      },
    };
  }
}
