/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat as ecsFields } from '@elastic/ecs';
import { Logger } from '@kbn/core/server';
import { FieldsMetadataClient } from './fields_metadata_client';
import { EcsFieldsSourceClient } from './source_clients/ecs_fields_source_client';
import { IntegrationsFieldsSourceClient } from './source_clients/integration_fields_source_client';
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

    const ecsFieldsSourceClient = EcsFieldsSourceClient.create({ ecsFields });
    const integrationFieldsSourceClient = IntegrationsFieldsSourceClient.create({ packageService });

    return {
      getClient() {
        return FieldsMetadataClient.create({
          logger,
          ecsFieldsSourceClient,
          integrationFieldsSourceClient,
        });
      },
    };
  }
}
