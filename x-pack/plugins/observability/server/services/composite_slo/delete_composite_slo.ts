/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CompositeSLOId } from '../../domain/models';
import { CompositeSLORepository } from './composite_slo_repository';

export class DeleteCompositeSLO {
  constructor(private compositeSloRepository: CompositeSLORepository) {}

  public async execute(compositeSloId: CompositeSLOId): Promise<void> {
    await this.compositeSloRepository.deleteById(compositeSloId);
  }
}
