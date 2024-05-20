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
import { IntegrationsFieldsSourceClient } from './repositories/integration_fields_repository';
import { FieldsMetadataServiceSetup, FieldsMetadataServiceStart } from './types';

export class FieldsMetadataService {
  private packageService: any; // TODO: update types

  constructor(private readonly logger: Logger) {}

  public setup(): FieldsMetadataServiceSetup {
    return {
      registerPackageService: (packageService) => {
        this.packageService = packageService;
      },
    };
  }

  public start(): FieldsMetadataServiceStart {
    const { logger, packageService } = this;

    const ecsFieldsRepository = EcsFieldsRepository.create({ ecsFields });
    const integrationFieldsSourceClient = IntegrationsFieldsSourceClient.create({ packageService });

    return {
      getClient() {
        return FieldsMetadataClient.create({
          logger,
          ecsFieldsRepository,
          integrationFieldsSourceClient,
        });
      },
    };
  }
}
