/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Investigation } from '../models/investigation';

export interface InvestigationRepository {
  save(investigation: Investigation): Promise<Investigation>;
  findAll(): Promise<Investigation[]>;
  findById(id: string): Promise<Investigation>;
  deleteById(id: string): Promise<void>;
}

export function investigationRepositoryFactory({
  soClient,
}: {
  soClient: SavedObjectsClientContract;
}): InvestigationRepository {
  return {
    async save(investigation: Investigation): Promise<Investigation> {
      return {
        id: '1',
        title: 'title',
      };
    },
    async findAll(): Promise<Investigation[]> {
      return [];
    },
    async findById(id: string): Promise<Investigation> {
      return {
        id: '1',
        title: 'title',
      };
    },
    async deleteById(id: string): Promise<void> {},
  };
}
