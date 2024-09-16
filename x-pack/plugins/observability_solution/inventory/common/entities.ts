/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface IdentityField {
  field: string;
  optional: boolean;
}

interface ExtractionMetadataField {
  source: string;
  destination: string;
  limit: number;
}
interface MetadataField {
  destination: string;
  source: string;
}

export interface EntityDataSource {
  indexPatterns: string[];
}

interface ExtractionDefinition {
  source: EntityDataSource;
  metadata: ExtractionMetadataField[];
}

interface EntityDefinitionBase {
  id: string;
  type: string;
  label: string;
  identityFields: IdentityField[];
  metadata: MetadataField[];
  displayNameTemplate: string;
  managed: boolean;
}

export interface InventoryEntityDefinition extends EntityDefinitionBase {
  definitionType: 'inventory';
  extractionDefinitions: ExtractionDefinition[];
  sources: EntityDataSource[];
}

export interface VirtualEntityDefinition extends EntityDefinitionBase {
  definitionType: 'virtual';
  parentTypeId: string;
  parentEntityId?: string;
}

export interface EntityMetricDefinition {
  id: string;
  displayName: string;
  expression: string;
  properties: Record<string, unknown>;
}

export type EntityDefinition = InventoryEntityDefinition | EntityDefinitionBase;

export interface Entity {
  type: string;
  id: string;
  displayName: string;
  properties: Record<string, unknown>;
}
