/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateCompositeSLOParams,
  CreateCompositeSLOResponse,
  CreateSLOResponse,
} from '@kbn/slo-schema';
import { v1 as uuidv1 } from 'uuid';

import { CompositeSLO } from '../../domain/models/composite_slo';
import { validateCompositeSLO } from '../../domain/services/composite_slo';
import { SLORepository } from '../slo/slo_repository';
import { CompositeSLORepository } from './composite_slo_repository';

export class CreateCompositeSLO {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private sloRepository: SLORepository
  ) {}

  public async execute(params: CreateCompositeSLOParams): Promise<CreateSLOResponse> {
    const compositeSlo = toCompositeSLO(params);
    const sloList = await this.sloRepository.findAllByIds(
      compositeSlo.sources.map((slo) => slo.id)
    );
    validateCompositeSLO(compositeSlo, sloList);

    await this.compositeSloRepository.save(compositeSlo, { throwOnConflict: true });

    return toResponse(compositeSlo);
  }
}

function toCompositeSLO(params: CreateCompositeSLOParams): CompositeSLO {
  const now = new Date();
  return {
    ...params,
    id: params.id ?? uuidv1(),
    tags: params.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

function toResponse(compositeSlo: CompositeSLO): CreateCompositeSLOResponse {
  return {
    id: compositeSlo.id,
  };
}
