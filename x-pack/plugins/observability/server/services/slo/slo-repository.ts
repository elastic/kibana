/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

import { StoredSLO, SLO } from '../../types/models';
import { SO_SLO_TYPE } from '../../saved_objects';

export interface SLORepository {
  save(slo: SLO): Promise<SLO>;
  findById(id: string): Promise<SLO>;
}

export class KibanaSavedObjectsSLORepository implements SLORepository {
  constructor(private soClient: SavedObjectsClientContract) {}

  async save(slo: SLO): Promise<SLO> {
    const now = new Date().toISOString();
    const savedSLO = await this.soClient.create<StoredSLO>(SO_SLO_TYPE, {
      ...slo,
      created_at: now,
      updated_at: now,
    });

    return toSLOModel(savedSLO.attributes);
  }

  async findById(id: string): Promise<SLO> {
    const slo = await this.soClient.get<StoredSLO>(SO_SLO_TYPE, id);
    return toSLOModel(slo.attributes);
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
    settings: slo.settings,
  };
}
