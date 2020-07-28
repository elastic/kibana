/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IESAggField } from './es_agg_field';
import { IVectorSource } from '../sources/vector_source';
// @ts-ignore
import { ITooltipProperty, TooltipProperty } from '../tooltips/tooltip_property';
import { TOP_TERM_PERCENTAGE_SUFFIX } from '../../../common/constants';
import { FIELD_ORIGIN } from '../../../common/constants';

export class TopTermPercentageField implements IESAggField {
  private readonly _topTermAggField: IESAggField;

  constructor(topTermAggField: IESAggField) {
    this._topTermAggField = topTermAggField;
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
    return true;
  }

  supportsFieldMeta(): boolean {
    return false;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return null;
  }

  async getCategoricalFieldMetaRequest(): Promise<unknown> {
    return null;
  }

  canValueBeFormatted(): boolean {
    return false;
  }
}
