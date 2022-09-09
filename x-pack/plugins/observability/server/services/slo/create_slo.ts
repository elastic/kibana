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
import { TransformInstaller } from './transform_installer';

import { CreateSLOParams } from '../../types/schema';

// TODO Add CreateSLOResponse schema & type
export class CreateSLO {
  constructor(
    private resourceInstaller: ResourceInstaller,
    private repository: SLORepository,
    private transformInstaller: TransformInstaller,
    private spaceId: string
  ) {}

  public async execute(sloParams: CreateSLOParams): Promise<SLO> {
    await this.resourceInstaller.ensureCommonResourcesInstalled(this.spaceId);
    const slo: SLO = {
      ...sloParams,
      id: uuid.v1(),
      settings: {
        destination_index: sloParams.settings?.destination_index,
      },
    };

    await this.repository.save(slo);
    await this.transformInstaller.installAndStartTransform(slo, this.spaceId);

    return slo;
  }
}
