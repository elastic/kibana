/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CompositeSLOId } from '../../domain/models';
import { SLONotFound, CompositeSLOSourceRevisionMismatch } from '../../errors';
import { SLORepository } from '../slo';
import { CompositeSLORepository } from './composite_slo_repository';

export class FindCompositeSloByIdWithSources {
  constructor(
    private compositeSloRepository: CompositeSLORepository,
    private sloRepository: SLORepository
  ) {}

  public async execute(compositeSloId: CompositeSLOId) {
    const compositeSlo = await this.compositeSloRepository.findById(compositeSloId);
    const sourceSlos = await this.sloRepository.findAllByIds(
      compositeSlo.sources.map((source) => source.id)
    );
    const sourcesWithSlo = compositeSlo.sources.map((source) => {
      const sourceSlo = sourceSlos.find((subject) => subject.id === source.id);
      if (!sourceSlo) {
        throw new SLONotFound(`SLO [${source.id}] not found`);
      }
      if (sourceSlo.revision !== source.revision) {
        throw new CompositeSLOSourceRevisionMismatch(
          `SLO [${source.id}] revision is ${sourceSlo.revision} when it should be ${source.revision}`
        );
      }
      return { ...source, slo: sourceSlo };
    });
    return { ...compositeSlo, sources: sourcesWithSlo };
  }
}
