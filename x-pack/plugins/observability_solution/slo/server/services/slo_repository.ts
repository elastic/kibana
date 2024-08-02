/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { ALL_VALUE, Paginated, Pagination, sloDefinitionSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/lib/Either';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { SLODefinition, StoredSLODefinition } from '../domain/models';
import { SLOIdConflict, SLONotFound } from '../errors';
import { SO_SLO_TYPE } from '../saved_objects';

export interface SLORepository {
  save(slo: SLODefinition, options?: { throwOnConflict: boolean }): Promise<SLODefinition>;
  findAllByIds(ids: string[]): Promise<SLODefinition[]>;
  findById(id: string): Promise<SLODefinition>;
  deleteById(id: string): Promise<void>;
  search(
    search: string,
    pagination: Pagination,
    options?: { includeOutdatedOnly?: boolean }
  ): Promise<Paginated<SLODefinition>>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract, private logger: Logger) {}

  async save(slo: SLODefinition, options = { throwOnConflict: false }): Promise<SLODefinition> {
    let existingSavedObjectId;
    const findResponse = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${slo.id})`,
    });
    if (findResponse.total === 1) {
      if (options.throwOnConflict) {
        throw new SLOIdConflict(`SLO [${slo.id}] already exists`);
      }

      existingSavedObjectId = findResponse.saved_objects[0].id;
    }

    await this.soClient.create<StoredSLODefinition>(SO_SLO_TYPE, toStoredSLO(slo), {
      id: existingSavedObjectId,
      overwrite: true,
    });

    return slo;
  }

  async findById(id: string): Promise<SLODefinition> {
    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${id})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    const slo = this.toSLO(response.saved_objects[0].attributes);
    if (slo === undefined) {
      throw new Error('Invalid stored SLO');
    }

    return slo;
  }

  async deleteById(id: string): Promise<void> {
    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: 1,
      filter: `slo.attributes.id:(${id})`,
    });

    if (response.total === 0) {
      throw new SLONotFound(`SLO [${id}] not found`);
    }

    await this.soClient.delete(SO_SLO_TYPE, response.saved_objects[0].id);
  }

  async findAllByIds(ids: string[]): Promise<SLODefinition[]> {
    if (ids.length === 0) return [];

    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: ids.length,
      filter: `slo.attributes.id:(${ids.join(' or ')})`,
    });

    return response.saved_objects
      .map((slo) => this.toSLO(slo.attributes))
      .filter((slo) => slo !== undefined) as SLODefinition[];
  }

  async search(
    search: string,
    pagination: Pagination,
    options: { includeOutdatedOnly?: boolean } = { includeOutdatedOnly: false }
  ): Promise<Paginated<SLODefinition>> {
    const response = await this.soClient.find<StoredSLODefinition>({
      type: SO_SLO_TYPE,
      page: pagination.page,
      perPage: pagination.perPage,
      search,
      searchFields: ['name'],
      ...(!!options.includeOutdatedOnly && {
        filter: `slo.attributes.version < ${SLO_MODEL_VERSION}`,
      }),
    });

    return {
      total: response.total,
      perPage: response.per_page,
      page: response.page,
      results: response.saved_objects
        .map((savedObject) => this.toSLO(savedObject.attributes))
        .filter((slo) => slo !== undefined) as SLODefinition[],
    };
  }

  toSLO(storedSLO: StoredSLODefinition): SLODefinition | undefined {
    const result = sloDefinitionSchema.decode({
      ...storedSLO,
      // groupBy was added in 8.10.0
      groupBy: storedSLO.groupBy ?? ALL_VALUE,
      // version was added in 8.12.0. This is a safeguard against SO migration issue.
      // if not present, we considered the version to be 1, e.g. not migrated.
      // We would need to call the _reset api on this SLO.
      version: storedSLO.version ?? 1,
      // settings.preventInitialBackfill was added in 8.15.0
      settings: {
        ...storedSLO.settings,
        preventInitialBackfill: storedSLO.settings?.preventInitialBackfill ?? false,
      },
    });

    if (isLeft(result)) {
      this.logger.error(`Invalid stored SLO with id [${storedSLO.id}]`);
      return undefined;
    }

    return result.right;
  }
}

function toStoredSLO(slo: SLODefinition): StoredSLODefinition {
  return sloDefinitionSchema.encode(slo);
}
