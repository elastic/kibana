/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuid } from 'uuid';

import { CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';

import { Duration, DurationUnit, SLO } from '../../domain/models';
import { ResourceInstaller } from './resource_installer';
import { SLORepository } from './slo_repository';
import { TransformManager } from './transform_manager';
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
      settings: {
        timestampField: params.settings?.timestampField ?? '@timestamp',
        syncDelay: params.settings?.syncDelay ?? new Duration(1, DurationUnit.Minute),
        frequency: params.settings?.frequency ?? new Duration(1, DurationUnit.Minute),
      },
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  private toResponse(slo: SLO): CreateSLOResponse {
    return {
      id: slo.id,
    };
  }
}
