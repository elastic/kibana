/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UpdateCompositeSLOParams,
  UpdateCompositeSLOResponse,
  updateCompositeSLOResponseSchema,
} from '@kbn/slo-schema';
import { CompositeSLO, CompositeSLOId } from '../../domain/models';
import { validateCompositeSLO } from '../../domain/services/composite_slo';
import { SLORepository } from '../slo';
import { CompositeSLORepository } from './composite_slo_repository';

export class UpdateCompositeSLO {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private sloRepository: SLORepository
  ) {}

  public async execute(
    compositeSloId: CompositeSLOId,
    params: UpdateCompositeSLOParams
  ): Promise<UpdateCompositeSLOResponse> {
    const originalCompositeSlo = await this.compositeSloRepository.findById(compositeSloId);

    const updatedCompositeSlo: CompositeSLO = Object.assign({}, originalCompositeSlo, params, {
      updatedAt: new Date(),
    });
    const sloList = await this.sloRepository.findAllByIds(
      updatedCompositeSlo.sources.map((slo) => slo.id)
    );
    validateCompositeSLO(updatedCompositeSlo, sloList);

    await this.compositeSloRepository.save(updatedCompositeSlo);

    return toResponse(updatedCompositeSlo);
  }
}

function toResponse(compositeSlo: CompositeSLO): UpdateCompositeSLOResponse {
  return updateCompositeSLOResponseSchema.encode(compositeSlo);
}
