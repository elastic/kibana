/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { Logger } from '@kbn/core/server';
import { ALL_VALUE, Paginated, Pagination, sloSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/lib/Either';
import { SLO_MODEL_VERSION } from '../../common/constants';
import { SLO, StoredSLO } from '../domain/models';
import { SLOIdConflict, SLONotFound } from '../errors';
import { SO_SLO_TYPE } from '../saved_objects';

export interface SLORepository {
  save(slo: SLO, options?: { throwOnConflict: boolean }): Promise<SLO>;
  findAllByIds(ids: string[]): Promise<SLO[]>;
  findById(id: string): Promise<SLO>;
  deleteById(id: string): Promise<void>;
  search(
    search: string,
    pagination: Pagination,
    options?: { includeOutdatedOnly?: boolean }
  ): Promise<Paginated<SLO>>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract, private logger: Logger) {}

  async save(slo: SLO, options = { throwOnConflict: false }): Promise<SLO> {
    let existingSavedObjectId;
    const findResponse = await this.soClient.find<StoredSLO>({
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

    await this.soClient.create<StoredSLO>(SO_SLO_TYPE, toStoredSLO(slo), {
      id: existingSavedObjectId,
      overwrite: true,
    });

    return slo;
  }

  async findById(id: string): Promise<SLO> {
    const response = await this.soClient.find<StoredSLO>({
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
    const response = await this.soClient.find<StoredSLO>({
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

  async findAllByIds(ids: string[]): Promise<SLO[]> {
    if (ids.length === 0) return [];

    const response = await this.soClient.find<StoredSLO>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: ids.length,
      filter: `slo.attributes.id:(${ids.join(' or ')})`,
    });

    return response.saved_objects
      .map((slo) => this.toSLO(slo.attributes))
      .filter((slo) => slo !== undefined) as SLO[];
  }

  async search(
    search: string,
    pagination: Pagination,
    options: { includeOutdatedOnly?: boolean } = { includeOutdatedOnly: false }
  ): Promise<Paginated<SLO>> {
    const response = await this.soClient.find<StoredSLO>({
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
        .filter((slo) => slo !== undefined) as SLO[],
    };
  }

  toSLO(storedSLO: StoredSLO): SLO | undefined {
    const result = sloSchema.decode({
      ...storedSLO,
      // groupBy was added in 8.10.0
      groupBy: storedSLO.groupBy ?? ALL_VALUE,
      // version was added in 8.12.0. This is a safeguard against SO migration issue.
      // if not present, we considered the version to be 1, e.g. not migrated.
      // We would need to call the _reset api on this SLO.
      version: storedSLO.version ?? 1,
    });

    if (isLeft(result)) {
      this.logger.error(`Invalid stored SLO with id [${storedSLO.id}]`);
      return undefined;
    }

    return result.right;
  }
}

function toStoredSLO(slo: SLO): StoredSLO {
  return sloSchema.encode(slo);
}
