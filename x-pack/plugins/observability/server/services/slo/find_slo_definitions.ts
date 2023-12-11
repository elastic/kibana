/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindSloDefinitionsResponse, findSloDefinitionsResponseSchema } from '@kbn/slo-schema';
import { SLORepository } from './slo_repository';

export class FindSLODefinitions {
  constructor(private repository: SLORepository) {}

  public async execute(search: string): Promise<FindSloDefinitionsResponse> {
    const sloList = await this.repository.search(search);
    return findSloDefinitionsResponseSchema.encode(sloList);
  }
}
