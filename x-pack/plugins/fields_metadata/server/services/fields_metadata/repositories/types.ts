/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldMetadataPlain } from '../../../../common';

export interface IntegrationFieldsSearchParams {
  integration: string;
  dataset?: string;
}

export type IntegrationName = string;
export type DatasetName = string;
export type ExtractedIntegrationFields = Record<IntegrationName, ExtractedDatasetFields>;
export type ExtractedDatasetFields = Record<DatasetName, FieldMetadataPlain>;

export type IntegrationFieldsExtractor = (
  params: IntegrationFieldsSearchParams
) => Promise<ExtractedIntegrationFields | undefined>;

export interface ExtractedIntegration {
  id: string;
  name: string;
  version: string;
}

export type IntegrationListExtractor = () => Promise<ExtractedIntegration[]>;
