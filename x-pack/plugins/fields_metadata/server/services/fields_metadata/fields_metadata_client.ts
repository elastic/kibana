/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { FieldName, FieldMetadata, FieldsMetadataDictionary } from '../../../common';
import { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import { IntegrationFieldsRepository } from './repositories/integration_fields_repository';
import { IntegrationFieldsSearchParams } from './repositories/types';
import { FindFieldsMetadataOptions, IFieldsMetadataClient } from './types';

interface FieldsMetadataClientDeps {
  logger: Logger;
  ecsFieldsRepository: EcsFieldsRepository;
  integrationFieldsRepository: IntegrationFieldsRepository;
}

export class FieldsMetadataClient implements IFieldsMetadataClient {
  private constructor(
    private readonly logger: Logger,
    private readonly ecsFieldsRepository: EcsFieldsRepository,
    private readonly integrationFieldsRepository: IntegrationFieldsRepository
  ) {}

  async getByName<TFieldName extends FieldName>(
    fieldName: TFieldName,
    { integration, dataset }: Partial<IntegrationFieldsSearchParams> = {}
  ): Promise<FieldMetadata | undefined> {
    this.logger.debug(`Retrieving field metadata for: ${fieldName}`);

    // 1. Try resolving from ecs static metadata
    let field = this.ecsFieldsRepository.getByName(fieldName);

    // 2. Try searching for the fiels in the Elastic Package Registry
    if (!field && integration) {
      field = await this.integrationFieldsRepository.getByName(fieldName, { integration, dataset });
    }

    return field;
  }

  async find({
    fieldNames,
    integration,
    dataset,
  }: FindFieldsMetadataOptions = {}): Promise<FieldsMetadataDictionary> {
    if (!fieldNames) {
      return this.ecsFieldsRepository.find();
    }

    const fields: Record<string, FieldMetadata> = {};
    for (const fieldName of fieldNames) {
      const field = await this.getByName(fieldName, { integration, dataset });

      if (field) {
        fields[fieldName] = field;
      }
    }

    return FieldsMetadataDictionary.create(fields);
  }

  public static create({
    logger,
    ecsFieldsRepository,
    integrationFieldsRepository,
  }: FieldsMetadataClientDeps) {
    return new FieldsMetadataClient(logger, ecsFieldsRepository, integrationFieldsRepository);
  }
}
