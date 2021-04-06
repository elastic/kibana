/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from 'src/plugins/data/public';
import { IESAggSource } from '../../sources/es_agg_source';
import { IVectorSource } from '../../sources/vector_source';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { ESAggTooltipProperty } from '../../tooltips/es_agg_tooltip_property';
import { IESAggField, CountAggFieldParams } from './agg_field_types';

// Agg without field. Essentially a count-aggregation.
export class CountAggField implements IESAggField {
  protected readonly _source: IESAggSource;
  private readonly _origin: FIELD_ORIGIN;
  protected readonly _label?: string;
  private readonly _canReadFromGeoJson: boolean;

  constructor({ label, source, origin, canReadFromGeoJson = true }: CountAggFieldParams) {
    this._source = source;
    this._origin = origin;
    this._label = label;
    this._canReadFromGeoJson = canReadFromGeoJson;
  }

  _getAggType(): AGG_TYPE {
    return AGG_TYPE.COUNT;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  getOrigin(): FIELD_ORIGIN {
    return this._origin;
  }

  getName(): string {
    return this._source.getAggKey(this._getAggType(), this.getRootName());
  }

  getRootName(): string {
    return '';
  }

  async getLabel(): Promise<string> {
    return this._label ? this._label : this._source.getAggLabel(AGG_TYPE.COUNT, '');
  }

  isValid(): boolean {
    return true;
  }

  async getDataType(): Promise<string> {
    return 'number';
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    const indexPattern = await this._source.getIndexPattern();
    const tooltipProperty = new TooltipProperty(this.getName(), await this.getLabel(), value);
    return new ESAggTooltipProperty(tooltipProperty, indexPattern, this, this._getAggType());
  }

  getValueAggDsl(indexPattern: IndexPattern): unknown | null {
    return null;
  }

  supportsFieldMeta(): boolean {
    return false;
  }

  getBucketCount() {
    return 0;
  }

  canValueBeFormatted(): boolean {
    return false;
  }

  async getExtendedStatsFieldMetaRequest(): Promise<unknown | null> {
    return null;
  }

  async getPercentilesFieldMetaRequest(percentiles: number[]): Promise<unknown | null> {
    return null;
  }

  async getCategoricalFieldMetaRequest(size: number): Promise<unknown> {
    return null;
  }

  supportsAutoDomain(): boolean {
    return this._canReadFromGeoJson ? true : this.supportsFieldMeta();
  }

  canReadFromGeoJson(): boolean {
    return this._canReadFromGeoJson;
  }

  isEqual(field: IESAggField) {
    return field.getName() === this.getName();
  }
}
