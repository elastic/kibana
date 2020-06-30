/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { IStyleProperty } from './style_property';
import { FIELD_ORIGIN } from '../../../../../common/constants';
import {
  CategoryFieldMeta,
  DynamicStylePropertyOptions,
  FieldMetaOptions,
  RangeFieldMeta,
} from '../../../../../common/descriptor_types';
import { IField } from '../../../fields/field';

export interface IDynamicStyleProperty extends IStyleProperty {
  getOptions(): DynamicStylePropertyOptions;
  getFieldMetaOptions(): FieldMetaOptions;
  getField(): IField | undefined;
  getFieldName(): string;
  getFieldOrigin(): FIELD_ORIGIN | undefined;
  getRangeFieldMeta(): RangeFieldMeta;
  getCategoryFieldMeta(): CategoryFieldMeta;
  getNumberOfCategories(): number;
  isFieldMetaEnabled(): boolean;
  isOrdinal(): boolean;
  supportsFieldMeta(): boolean;
  getFieldMetaRequest(): Promise<unknown>;
  supportsMbFeatureState(): boolean;
  pluckOrdinalStyleMetaFromFeatures(features: unknown[]): RangeFieldMeta;
  pluckCategoricalStyleMetaFromFeatures(features: unknown[]): CategoryFieldMeta;
  pluckOrdinalStyleMetaFromFieldMetaData(fieldMetaData: unknown): RangeFieldMeta;
  pluckCategoricalStyleMetaFromFieldMetaData(fieldMetaData: unknown): CategoryFieldMeta;
}
