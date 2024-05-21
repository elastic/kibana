/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldMetadata,
  FieldName,
  FieldsMetadataDictionary,
  PartialFieldMetadataPlain,
} from '../../../../common';

export interface IFieldsRepository {
  getByName<TFieldName extends FieldName>(
    fieldName: TFieldName
  ): Promise<FieldMetadata | undefined> | FieldMetadata | undefined;
  find<TFieldName extends FieldName>(params: {
    fieldNames?: TFieldName[];
  }): Promise<FieldsMetadataDictionary> | FieldsMetadataDictionary;
}

export type IntegrationFieldsExtractor = ({
  integration,
  dataset,
}: {
  integration: string;
  dataset?: string;
}) => Promise<Record<string, PartialFieldMetadataPlain>>;
