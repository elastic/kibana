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

export type EntityMetricDefinition = {
  id: string;
  displayName: string;
  properties: Record<string, unknown>;
} & ({ filter: string } | { expression: string });

export type EntityDefinition = InventoryEntityDefinition | EntityDefinitionBase;

export interface Entity {
  type: string;
  displayName: string;
  properties: Record<string, unknown>;
}

export function getRerouteCode(rootEntity: Entity) {
  const normalizedEnityName = rootEntity.displayName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

  // per identity field, generate a painless snippet that is returning false if the field is not equal to the value of the root entity property.
  // check both dotted field name and nested object in a safe way
  const checks = getPainlessCheck(rootEntity);

  const processor = {
    reroute: {
      if: checks,
      dataset: normalizedEnityName,
    },
  };

  return JSON.stringify(processor, null, 2);
}
export function getPainlessCheck(rootEntity: Entity) {
  const identityFields = rootEntity.properties['entity.identityFields'] as string[] | string;
  const checks = (Array.isArray(identityFields) ? identityFields : [identityFields])
    .map((field) => {
      const fieldParts = field.split('.');
      return `if (ctx.__original_doc.${fieldParts.join('?.')} == null || ctx.__original_doc.${fieldParts.join('?.')} != "${
        rootEntity.properties[field]
      }") { return false }`;
    })
    .join('\n\n');
  return `
  ${checks}
  return true;`;
}

export function getPainlessDefinitionCheck(rootEntity: InventoryEntityDefinition) {
  const identityFields = rootEntity.identityFields.map((field) => field.field);
  const checks = identityFields
    .map((field) => {
      const fieldParts = field.split('.');
      return `if (ctx.__original_doc.${fieldParts.join('?.')} != null) { return false }`;
    })
    .join('\n\n');
  return `
  ${checks}
  return true;`;
}
