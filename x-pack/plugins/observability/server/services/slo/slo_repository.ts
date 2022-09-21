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
    const now = new Date().toISOString();
    const savedSLO = await this.soClient.create<StoredSLO>(
      SO_SLO_TYPE,
      {
        ...slo,
        created_at: now,
        updated_at: now,
      },
      { id: slo.id }
    );

    return toSLOModel(savedSLO.attributes);
  }

  async findById(id: string): Promise<SLO> {
    try {
      const slo = await this.soClient.get<StoredSLO>(SO_SLO_TYPE, id);
      return toSLOModel(slo.attributes);
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

function toSLOModel(slo: StoredSLO): SLO {
  return {
    id: slo.id,
    name: slo.name,
    description: slo.description,
    indicator: slo.indicator,
    time_window: slo.time_window,
    budgeting_method: slo.budgeting_method,
    objective: slo.objective,
  };
}
