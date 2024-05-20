/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldName, FieldMetadata } from '../../../common';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServiceStartDeps {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServiceSetup {}

export interface FieldsMetadataServiceStart {
  getClient(): IFieldsMetadataClient;
}

export interface IFieldsMetadataClient {
  getByName(fieldName: FieldName): FieldMetadata | undefined;
  find<TFieldName extends FieldName>(params: {
    fieldNames?: TFieldName[];
  }): Record<TFieldName, FieldMetadata>;
}
