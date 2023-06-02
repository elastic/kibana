/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOTransformId } from '../../assets/constants';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

export class ManageSLO {
  constructor(private repository: SLORepository, private transformManager: TransformManager) {}

  async enable(sloId: string) {
    const slo = await this.repository.findById(sloId);
    if (slo.enabled) {
      return;
    }

    await this.transformManager.start(getSLOTransformId(slo.id, slo.revision));
    slo.enabled = true;
    slo.updatedAt = new Date();
    await this.repository.save(slo);
  }

  async disable(sloId: string) {
    const slo = await this.repository.findById(sloId);
    if (!slo.enabled) {
      return;
    }

    await this.transformManager.stop(getSLOTransformId(slo.id, slo.revision));
    slo.enabled = false;
    slo.updatedAt = new Date();
    await this.repository.save(slo);
  }
}
