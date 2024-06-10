/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat as ecsFields } from '@elastic/ecs';
import { Logger } from '@kbn/core/server';
import { FieldsMetadataClient } from './fields_metadata_client';
import { EcsFieldsRepository } from './repositories/ecs_fields_repository';
import { IntegrationFieldsRepository } from './repositories/integration_fields_repository';
import { IntegrationFieldsExtractor } from './repositories/types';
import { FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './types';

export class FieldsMetadataService {
  private integrationFieldsExtractor: IntegrationFieldsExtractor = () => Promise.resolve({});

  constructor(private readonly logger: Logger) {}

  public setup(): FieldsMetadataServiceSetup {
    return {
      registerIntegrationFieldsExtractor: (extractor: IntegrationFieldsExtractor) => {
        this.integrationFieldsExtractor = extractor;
      },
    };
  }

  public start(): FieldsMetadataServiceStart {
    const { logger, integrationFieldsExtractor } = this;

    const ecsFieldsRepository = EcsFieldsRepository.create({ ecsFields });
    const integrationFieldsRepository = IntegrationFieldsRepository.create({
      integrationFieldsExtractor,
    });

    return {
      getClient() {
        return FieldsMetadataClient.create({
          logger,
          ecsFieldsRepository,
          integrationFieldsRepository,
        });
      },
    };
  }
}
