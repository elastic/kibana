/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldName, FieldMetadata, FieldsMetadataDictionary } from '../../../common';
import { IntegrationFieldsExtractor, IntegrationFieldsSearchParams } from './repositories/types';

export * from './repositories/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServiceStartDeps {}

export interface FieldsMetadataServiceSetup {
  registerIntegrationFieldsExtractor: (extractor: IntegrationFieldsExtractor) => void;
}

export interface FieldsMetadataServiceStart {
  getClient(): IFieldsMetadataClient;
}

export interface FindFieldsMetadataOptions extends Partial<IntegrationFieldsSearchParams> {
  fieldNames?: FieldName[];
}

export interface IFieldsMetadataClient {
  getByName(fieldName: FieldName): Promise<FieldMetadata | undefined>;
  find(params: FindFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
}
