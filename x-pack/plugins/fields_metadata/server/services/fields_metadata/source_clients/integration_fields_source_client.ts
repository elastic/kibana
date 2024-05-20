/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldMetadata, FieldName } from '../../../../common';
import { ISourceClient } from './types';

interface IntegrationsFieldsSourceClientDeps {
  packageService: PackageService;
}

export class IntegrationsFieldsSourceClient implements ISourceClient {
  private constructor(private readonly packageClient: PackageClient) {}

  getByName<TFieldName extends FieldName>(fieldName: TFieldName) {
    throw new Error('TODO: Implement the IntegrationsFieldsSourceClient#getByName');
  }

  find({ fieldNames }: { fieldNames?: FieldName[] } = {}): Record<FieldName, FieldMetadata> {
    throw new Error('TODO: Implement the IntegrationsFieldsSourceClient#getByName');
  }

  public static create({ packageService }: IntegrationsFieldsSourceClientDeps) {
    if (!packageService) {
      return {
        getByName: () => undefined,
        find: () => ({}),
      };
    }

    const packageClient = packageService.asInternalUser;

    return new IntegrationsFieldsSourceClient(packageClient);
  }
}
