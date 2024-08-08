/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { isLeft } from 'fp-ts/lib/Either';
import { Investigation, StoredInvestigation, investigationSchema } from '../models/investigation';
import { SO_INVESTIGATION_TYPE } from '../saved_objects/investigation';
import { Paginated, Pagination } from '../models/pagination';

export interface InvestigationRepository {
  save(investigation: Investigation): Promise<void>;
  findById(id: string): Promise<Investigation>;
  deleteById(id: string): Promise<void>;
  search(pagination: Pagination): Promise<Paginated<Investigation>>;
}

export function investigationRepositoryFactory({
  soClient,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  logger: Logger;
}): InvestigationRepository {
  function toInvestigation(stored: StoredInvestigation): Investigation | undefined {
    const result = investigationSchema.decode({
      ...stored,
    });

    if (isLeft(result)) {
      logger.error(`Invalid stored Investigation with id [${stored.id}]`);
      return undefined;
    }

    return result.right;
  }

  function toStoredInvestigation(investigation: Investigation): StoredInvestigation {
    return investigationSchema.encode(investigation);
  }

  return {
    async save(investigation: Investigation): Promise<void> {
      await soClient.create<StoredInvestigation>(
        SO_INVESTIGATION_TYPE,
        toStoredInvestigation(investigation),
        {
          id: investigation.id,
          overwrite: true,
        }
      );
    },

    async findById(id: string): Promise<Investigation> {
      const response = await soClient.find<StoredInvestigation>({
        type: SO_INVESTIGATION_TYPE,
        page: 1,
        perPage: 1,
        filter: `investigation.attributes.id:(${id})`,
      });

      if (response.total === 0) {
        throw new Error(`Investigation [${id}] not found`);
      }

      const investigation = toInvestigation(response.saved_objects[0].attributes);
      if (investigation === undefined) {
        throw new Error('Invalid stored Investigation');
      }

      return investigation;
    },

    async deleteById(id: string): Promise<void> {
      const response = await soClient.find<StoredInvestigation>({
        type: SO_INVESTIGATION_TYPE,
        page: 1,
        perPage: 1,
        filter: `investigation.attributes.id:(${id})`,
      });

      if (response.total === 0) {
        throw new Error(`Investigation [${id}] not found`);
      }

      await soClient.delete(SO_INVESTIGATION_TYPE, response.saved_objects[0].id);
    },

    async search(pagination: Pagination): Promise<Paginated<Investigation>> {
      const response = await soClient.find<StoredInvestigation>({
        type: SO_INVESTIGATION_TYPE,
        page: pagination.page,
        perPage: pagination.perPage,
      });

      return {
        total: response.total,
        perPage: response.per_page,
        page: response.page,
        results: response.saved_objects
          .map((savedObject) => toInvestigation(savedObject.attributes))
          .filter((investigation) => investigation !== undefined) as Investigation[],
      };
    },
  };
}
