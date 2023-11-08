/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { sloSchema } from '@kbn/slo-schema';
import { fold } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as t from 'io-ts';
import { SLO, StoredSLO } from '../../domain/models';
import { SLOIdConflict, SLONotFound } from '../../errors';
import { SO_SLO_TYPE } from '../../saved_objects';

export interface SLORepository {
  save(slo: SLO, options?: { throwOnConflict: boolean }): Promise<SLO>;
  findAllByIds(ids: string[]): Promise<SLO[]>;
  findById(id: string): Promise<SLO>;
  deleteById(id: string): Promise<void>;
  search(search: string): Promise<SLO[]>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract) {}

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

    const savedSLO = await this.soClient.create<StoredSLO>(SO_SLO_TYPE, toStoredSLO(slo), {
      id: existingSavedObjectId,
      overwrite: true,
    });

    return toSLO(savedSLO.attributes);
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

    return toSLO(response.saved_objects[0].attributes);
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

    try {
      const response = await this.soClient.find<StoredSLO>({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: ids.length,
        filter: `slo.attributes.id:(${ids.join(' or ')})`,
      });
      return response.saved_objects.map((slo) => toSLO(slo.attributes));
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw new SLONotFound(`SLOs [${ids.join(',')}] not found`);
      }
      throw err;
    }
  }

  async search(search: string): Promise<SLO[]> {
    try {
      const response = await this.soClient.find<StoredSLO>({
        type: SO_SLO_TYPE,
        page: 1,
        perPage: 25,
        search,
        searchFields: ['name'],
      });
      return response.saved_objects.map((slo) => toSLO(slo.attributes));
    } catch (err) {
      throw err;
    }
  }
}

function toStoredSLO(slo: SLO): StoredSLO {
  return sloSchema.encode(slo);
}

function toSLO(storedSLO: StoredSLO): SLO {
  return pipe(
    sloSchema.decode(storedSLO),
    fold(() => {
      throw new Error('Invalid Stored SLO');
    }, t.identity)
  );
}
