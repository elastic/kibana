/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export interface BaseEntityDefinition {
  definition_type: 'type' | 'source';
  template_version: number;
}

export const entityTypeDefinitionRt = z.object({
  id: z.string(),
});

export type EntityTypeDefinition = z.TypeOf<typeof entityTypeDefinitionRt>;

export interface StoredEntityTypeDefinition extends BaseEntityDefinition {
  type: EntityTypeDefinition;
}

export const entitySourceDefinitionRt = z.object({
  id: z.string(),
});

export type EntitySourceDefinition = z.TypeOf<typeof entitySourceDefinitionRt>;

export interface StoredEntitySourceDefinition extends BaseEntityDefinition {
  source: EntitySourceDefinition;
}

interface SuccessStatus<TResource> {
  status: 'success';
  resource?: TResource;
}

interface ConflictStatus {
  status: 'conflict';
  reason: string;
}

interface ErrorStatus {
  status: 'error';
  reason: string;
}

export type OperationStatus<TResource> = SuccessStatus<TResource> | ConflictStatus | ErrorStatus;
