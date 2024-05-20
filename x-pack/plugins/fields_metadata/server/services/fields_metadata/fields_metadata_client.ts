/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import { Logger } from '@kbn/core/server';
import { FieldName, FieldMetadata, EcsFieldMetadata } from '../../../common';
import { EcsFieldsSourceClient } from './source_clients/ecs_fields_source_client';
import { IntegrationsFieldsSourceClient } from './source_clients/integration_fields_source_client';
import { IFieldsMetadataClient } from './types';

interface FieldsMetadataClientDeps {
  logger: Logger;
  ecsFieldsSourceClient: EcsFieldsSourceClient;
  integrationFieldsSourceClient: IntegrationsFieldsSourceClient;
}

export class FieldsMetadataClient implements IFieldsMetadataClient {
  private constructor(
    private readonly logger: Logger,
    private readonly ecsFieldsSourceClient: EcsFieldsSourceClient,
    private readonly integrationFieldsSourceClient: IntegrationsFieldsSourceClient
  ) {}

  getByName<TFieldName extends FieldName>(fieldName: TFieldName): FieldMetadata | undefined {
    this.logger.debug(`Retrieving field metadata for: ${fieldName}`);

    const field = this.ecsFieldsSourceClient.getByName(fieldName);

    // TODO: enable resolution for integration field
    // if (!field) {
    //   field = this.integrationFieldsSourceClient.getByName(fieldName);
    // }

    return field;
  }

  find({ fieldNames }: { fieldNames?: FieldName[] } = {}): Record<FieldName, FieldMetadata> {
    if (!fieldNames) {
      return EcsFlat;
    }

    const res = fieldNames.reduce((fieldsMetadata, fieldName) => {
      const field = this.getByName(fieldName);

      if (field) {
        fieldsMetadata[fieldName] = field;
      }

      return fieldsMetadata;
    }, {} as Record<FieldName, FieldMetadata>);

    return res;
  }

  public static create({
    logger,
    ecsFieldsSourceClient,
    integrationFieldsSourceClient,
  }: FieldsMetadataClientDeps) {
    return new FieldsMetadataClient(logger, ecsFieldsSourceClient, integrationFieldsSourceClient);
  }
}
