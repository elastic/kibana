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
import { CreateSLOParams, CreateSLOResponse } from '../../types/rest_specs';
import { validateSLO } from '../../domain/services';

export class CreateSLO {
  constructor(
    private resourceInstaller: ResourceInstaller,
    private repository: SLORepository,
    private transformManager: TransformManager
  ) {}

  public async execute(params: CreateSLOParams): Promise<CreateSLOResponse> {
    const slo = this.toSLO(params);
    validateSLO(slo);

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

  private toSLO(params: CreateSLOParams): SLO {
    const now = new Date();
    return {
      ...params,
      id: uuid.v1(),
      revision: 1,
      created_at: now,
      updated_at: now,
    };
  }

  private toResponse(slo: SLO): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
