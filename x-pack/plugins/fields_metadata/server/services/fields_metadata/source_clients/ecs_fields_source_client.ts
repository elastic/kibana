/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EcsFieldMetadata,
  EcsFieldName,
  FieldMetadata,
  FieldName,
  TEcsFields,
} from '../../../../common';
import { ISourceClient } from './types';

interface EcsFieldsSourceClientDeps {
  ecsFields: TEcsFields;
}

export class EcsFieldsSourceClient implements ISourceClient {
  private constructor(private readonly ecsFields: TEcsFields) {}

  getByName<TFieldName extends FieldName>(fieldName: TFieldName): EcsFieldMetadata | undefined {
    return fieldName in this.ecsFields ? this.ecsFields[fieldName as EcsFieldName] : undefined;
  }

  find({ fieldNames }: { fieldNames?: FieldName[] } = {}): Record<FieldName, FieldMetadata> {
    if (!fieldNames) {
      return this.ecsFields;
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

  public static create({ ecsFields }: EcsFieldsSourceClientDeps) {
    return new EcsFieldsSourceClient(ecsFields);
  }
}
