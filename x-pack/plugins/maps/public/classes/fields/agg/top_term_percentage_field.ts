/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IESAggField } from './agg_field_types';
import { IVectorSource } from '../../sources/vector_source';
import { ITooltipProperty, TooltipProperty } from '../../tooltips/tooltip_property';
import { TOP_TERM_PERCENTAGE_SUFFIX, FIELD_ORIGIN } from '../../../../common/constants';
import { TileMetaFeature } from '../../../../common/descriptor_types';

export class TopTermPercentageField implements IESAggField {
  private readonly _topTermAggField: IESAggField;

  constructor(topTermAggField: IESAggField) {
    this._topTermAggField = topTermAggField;
  }

  supportsFieldMetaFromEs(): boolean {
    return false;
  }

  supportsFieldMetaFromLocalData(): boolean {
    if (this.getSource().isMvt()) {
      // Elasticsearch vector tile search API does not support top term metric so meta tile does not contain any values
      return false;
    } else {
      // field meta can be extracted from local data when field is geojson source
      return true;
    }
  }

  getSource(): IVectorSource {
    return this._topTermAggField.getSource();
  }

  getMbFieldName(): string {
    return this.getName();
  }

  getOrigin(): FIELD_ORIGIN {
    return this._topTermAggField.getOrigin();
  }

  getName(): string {
    return `${this._topTermAggField.getName()}${TOP_TERM_PERCENTAGE_SUFFIX}`;
  }

  getRootName(): string {
    // top term percentage is a derived value so it has no root field
    return '';
  }

  async getLabel(): Promise<string> {
    const baseLabel = await this._topTermAggField.getLabel();
    return `${baseLabel}%`;
  }

  isValid(): boolean {
    return this._topTermAggField.isValid();
  }

  async getDataType(): Promise<string> {
    return 'number';
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    return new TooltipProperty(this.getName(), await this.getLabel(), value);
  }

  getValueAggDsl(): null {
    return null;
  }

  getBucketCount(): number {
    return 0;
  }

  isCount() {
    return false;
  }

  async getExtendedStatsFieldMetaRequest(): Promise<unknown | null> {
    return null;
  }

  async getPercentilesFieldMetaRequest(percentiles: number[]): Promise<unknown | null> {
    return null;
  }

  async getCategoricalFieldMetaRequest(): Promise<unknown> {
    return null;
  }

  canValueBeFormatted(): boolean {
    return false;
  }

  isEqual(field: IESAggField) {
    return field.getName() === this.getName();
  }

  pluckRangeFromTileMetaFeature(metaFeature: TileMetaFeature) {
    return null;
  }
}
