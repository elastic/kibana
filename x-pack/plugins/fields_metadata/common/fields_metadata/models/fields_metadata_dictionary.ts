/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mapValues from 'lodash/mapValues';
import { FieldAttribute, FieldMetadataPlain, PartialFieldMetadataPlain } from '../types';
import { FieldMetadata } from './field_metadata';

export type FieldsMetadataMap = Record<string, FieldMetadata>;

export class FieldsMetadataDictionary {
  private constructor(private readonly fields: FieldsMetadataMap) {}

  pick(attributes: FieldAttribute[]): Record<string, PartialFieldMetadataPlain> {
    return mapValues(this.fields, (field) => field.pick(attributes));
  }

  toPlain(): Record<string, FieldMetadataPlain> {
    return mapValues(this.fields, (field) => field.toPlain());
  }

  public static create(fields: FieldsMetadataMap) {
    return new FieldsMetadataDictionary(fields);
  }
}
