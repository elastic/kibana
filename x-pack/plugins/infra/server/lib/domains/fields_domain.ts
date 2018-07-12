/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortBy } from 'lodash';

import { FieldsAdapter, InfraFrameworkRequest } from '../infra_types';

import { InfraField, InfraIndexPattern } from '../../../common/types';

export class InfraFieldsDomain {
  private adapter: FieldsAdapter;
  constructor(adapter: FieldsAdapter) {
    this.adapter = adapter;
  }

  public async getFields(
    req: InfraFrameworkRequest,
    indexPattern: InfraIndexPattern = {
      pattern: '*',
      timeFieldName: '@timestamp',
    }
  ): Promise<InfraField[]> {
    const fieldCaps: any = await this.adapter.getFieldCaps(req, indexPattern.pattern);

    const fields: any = get(fieldCaps, 'fields');
    const results: any = fields
      ? Object.keys(fields).map((name: keyof typeof fields): InfraField => {
          const fieldData: any = fields[name];
          const [type]: any = Object.keys(fieldData);
          const def: any = fieldData[type];
          return {
            aggregatable: def.aggregatable,
            name: String(name),
            searchable: def.searchable,
            type,
          };
        })
      : [];
    return sortBy(results, 'name');
  }
}
