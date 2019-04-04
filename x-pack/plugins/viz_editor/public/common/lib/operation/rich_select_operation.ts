/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Datasource } from '../..';
import { DatasourceField, SelectOperation, SelectOperator } from '../../../../common';
import { fieldToOperation } from './operation_builder';

export class RichSelectOperation {
  public static fromObject(operation: SelectOperation, datasource?: Datasource) {
    return new RichSelectOperation(
      operation.operator,
      'field' in operation.argument ? operation.argument.field : null,
      datasource
    );
  }

  public readonly operator: SelectOperator;

  private fieldName?: string;
  private field?: DatasourceField;

  constructor(operator: SelectOperator, fieldName: string | null, datasource?: Datasource) {
    if (fieldName) {
      this.fieldName = fieldName;
    }
    this.operator = operator;
    if (datasource) {
      this.setDatasource(datasource);
    }
  }

  // Used to determine whether the operation is still valid or has a "hole"
  public isValid() {
    return true;
  }

  public toObject(): SelectOperation {
    if (!this.fieldName) {
      return { operator: 'count', argument: {}, alias: 'count' };
    }

    if (!this.field) {
      throw new Error('Cannot convert to raw object without datasource');
    }

    return fieldToOperation(this.field, this.operator);
  }

  private setDatasource(datasource: Datasource) {
    if (this.fieldName && datasource.fields) {
      const field = datasource.fields.find((f: DatasourceField) => f.name === this.fieldName);
      if (field) {
        this.field = field;
      }
    }
  }
}
