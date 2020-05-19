/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { ESTooltipProperty } from '../tooltips/es_tooltip_property';
import { ITooltipProperty, TooltipProperty } from '../tooltips/tooltip_property';
import { indexPatterns } from '../../../../../../src/plugins/data/public';
import { IFieldType } from '../../../../../../src/plugins/data/public';
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

  canValueBeFormatted(): boolean {
    return true;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async _getIndexPatternField(): Promise<IFieldType | undefined> {
    const indexPattern = await this._source.getIndexPattern();
    const indexPatternField = indexPattern.fields.getByName(this.getName());
    return indexPatternField && indexPatterns.isNestedField(indexPatternField)
      ? undefined
      : indexPatternField;
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    const indexPattern = await this._source.getIndexPattern();
    const tooltipProperty = new TooltipProperty(this.getName(), await this.getLabel(), value);
    return new ESTooltipProperty(tooltipProperty, indexPattern, this as IField);
  }

  async getDataType(): Promise<string> {
    const indexPatternField = await this._getIndexPatternField();
    return indexPatternField ? indexPatternField.type : '';
  }

  supportsFieldMeta(): boolean {
    return true;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    const indexPatternField = await this._getIndexPatternField();

    if (
      !indexPatternField ||
      (indexPatternField.type !== 'number' && indexPatternField.type !== 'date')
    ) {
      return null;
    }

    // TODO remove local typing once Kibana has figured out a core place for Elasticsearch aggregation request types
    // https://github.com/elastic/kibana/issues/60102
    const extendedStats: { script?: unknown; field?: string } = {};
    if (indexPatternField.scripted) {
      extendedStats.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      extendedStats.field = this.getName();
    }
    return {
      [this.getName()]: {
        extended_stats: extendedStats,
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
      [this.getName()]: {
        terms: topTerms,
      },
    };
  }
}
