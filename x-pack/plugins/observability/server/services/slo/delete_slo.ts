/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOTransformId } from '../../assets/constants';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';

export class DeleteSLO {
  constructor(private repository: SLORepository, private transformManager: TransformManager) {}

  public async execute(sloId: string): Promise<void> {
    const sloTransformId = getSLOTransformId(sloId);
    await this.transformManager.stop(sloTransformId);
    await this.transformManager.uninstall(sloTransformId);
    await this.repository.deleteById(sloId);
  }
}
