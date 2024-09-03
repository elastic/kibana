/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EntityTypeDefinition {
  name: string;
  label: string;
  icon: string;
}

interface ConcreteIdentifyField {
  identity: {
    type: 'concrete';
  };
  field: string;
  value: string;
}

interface VirtualIdentityField {
  identity: {
    type: 'virtual';
  };
  field: string;
  optional?: boolean;
  source?: string;
}

export type IdentityField = ConcreteIdentifyField | VirtualIdentityField;

interface VirtualMetadataField {
  metadata: {
    type: 'virtual';
  };
  field: string;
  source?: string;
  type: 'keyword';
  limit?: number;
}

type MetadataField = VirtualMetadataField;

export interface VirtualEntityDefinition {
  definition: {
    id?: string;
    type: 'virtual';
  };
  entity: {
    type: string;
  };
  indexPatterns: string[];
  identityFields: IdentityField[];
  metadata: MetadataField[];
}

interface ConcreteEntityDefinition {
  definition: {
    id: string;
    type: 'concrete';
  };
  entity: {
    type: string;
  };
  identityFields: ConcreteIdentifyField[];
}

export type EntityDefinition = VirtualEntityDefinition | ConcreteEntityDefinition;
