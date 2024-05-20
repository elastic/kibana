/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldsMetadataDictionary } from '../../../../common/fields_metadata/models/fields_dictionary';
import type { FieldMetadata, FieldName } from '../../../../common';

export interface IFieldsRepository {
  getByName<TFieldName extends FieldName>(fieldName: TFieldName): FieldMetadata | undefined;
  find<TFieldName extends FieldName>(params: { fieldNames?: TFieldName[] }): FieldsMetadataDictionary;
}
