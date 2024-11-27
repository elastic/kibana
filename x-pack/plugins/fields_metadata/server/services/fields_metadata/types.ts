/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest } from '@kbn/core/server';
import { FieldName, FieldMetadata, FieldsMetadataDictionary } from '../../../common';
import {
  IntegrationFieldsExtractor,
  IntegrationFieldsSearchParams,
  IntegrationListExtractor,
} from './repositories/types';

export * from './repositories/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServiceStartDeps {}

export interface FieldsMetadataServiceSetup {
  registerIntegrationFieldsExtractor: (extractor: IntegrationFieldsExtractor) => void;
  registerIntegrationListExtractor: (extractor: IntegrationListExtractor) => void;
}

export interface FieldsMetadataServiceStart {
  getClient(request: KibanaRequest): Promise<IFieldsMetadataClient>;
}

export interface FindFieldsMetadataOptions extends Partial<IntegrationFieldsSearchParams> {
  fieldNames?: FieldName[];
}

export interface IFieldsMetadataClient {
  getByName(fieldName: FieldName): Promise<FieldMetadata | undefined>;
  find(params: FindFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
}
