/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMetadata, FieldName } from '../../../../common';
import { IFieldsRepository, IntegrationFieldsExtractor } from './types';

interface IntegrationsFieldsRepositoryDeps {
  integrationFieldsExtractor: IntegrationFieldsExtractor;
}

export class IntegrationsFieldsRepository implements IFieldsRepository {
  private constructor(private readonly fieldsExtractor: IntegrationFieldsExtractor) {}

  async getByName<TFieldName extends FieldName>(fieldName: TFieldName) {
    const data = await this.fieldsExtractor({
      integration: '1password',
      // dataset: 'audit_events',
    });

    console.log(JSON.stringify(data, null, 2));

    return undefined;
  }

  async find({ fieldNames }: { fieldNames?: FieldName[] } = {}): Record<FieldName, FieldMetadata> {
    throw new Error('TODO: Implement the IntegrationsFieldsRepository#getByName');
  }

  public static create({ integrationFieldsExtractor }: IntegrationsFieldsRepositoryDeps) {
    return new IntegrationsFieldsRepository(integrationFieldsExtractor);
  }
}
