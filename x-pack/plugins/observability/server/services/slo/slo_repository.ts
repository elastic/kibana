/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';

import { StoredSLO, SLO } from '../../types/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { SLONotFound } from '../../errors';

export interface SLORepository {
  save(slo: SLO): Promise<SLO>;
  findById(id: string): Promise<SLO>;
  deleteById(id: string): Promise<void>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async save(slo: SLO): Promise<SLO> {
    const savedSLO = await this.soClient.create<StoredSLO>(SO_SLO_TYPE, slo, {
      id: slo.id,
      overwrite: true,
    });

    return savedSLO.attributes;
  }

  async findById(id: string): Promise<SLO> {
    try {
      const slo = await this.soClient.get<StoredSLO>(SO_SLO_TYPE, id);
      return slo.attributes;
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw new SLONotFound(`SLO [${id}] not found`);
      }
      throw err;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.soClient.delete(SO_SLO_TYPE, id);
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        throw new SLONotFound(`SLO [${id}] not found`);
      }
      throw err;
    }
  }
}
