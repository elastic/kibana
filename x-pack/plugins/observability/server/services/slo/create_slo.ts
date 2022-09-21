/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import { SLO } from '../../types/models';
import { ResourceInstaller } from './resource_installer';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
import { CreateSLOParams, CreateSLOResponse } from '../../types/schema';

export class CreateSLO {
  constructor(
    private resourceInstaller: ResourceInstaller,
    private repository: SLORepository,
    private transformManager: TransformManager
  ) {}

  public async execute(sloParams: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(sloParams);

    await this.resourceInstaller.ensureCommonResourcesInstalled();
    await this.repository.save(slo);

    let sloTransformId;
    try {
      sloTransformId = await this.transformManager.install(slo);
    } catch (err) {
      await this.repository.deleteById(slo.id);
      throw err;
    }

    try {
      await this.transformManager.start(sloTransformId);
    } catch (err) {
      await Promise.all([
        this.transformManager.uninstall(sloTransformId),
        this.repository.deleteById(slo.id),
      ]);

      throw err;
    }

    return this.toResponse(slo);
  }

  private toSLO(sloParams: CreateSLOParams): SLO {
    return {
      ...sloParams,
      id: uuid.v1(),
    };
  }

  private toResponse(slo: SLO): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
