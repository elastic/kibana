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

export class TopTermPercentageField implements IESAggField {
  private readonly _topTermAggField: IESAggField;
  private readonly _canReadFromGeoJson: boolean;

  constructor(topTermAggField: IESAggField, canReadFromGeoJson: boolean = true) {
    this._topTermAggField = topTermAggField;
    this._canReadFromGeoJson = canReadFromGeoJson;
  }

  getSource(): IVectorSource {
    return this._topTermAggField.getSource();
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

  supportsAutoDomain(): boolean {
    return this._canReadFromGeoJson;
  }

  supportsFieldMeta(): boolean {
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

  canReadFromGeoJson(): boolean {
    return this._canReadFromGeoJson;
  }

  isEqual(field: IESAggField) {
    return field.getName() === this.getName();
  }
}
