/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { TrustedAppGenerator } from '../../../../common/endpoint/data_generators/trusted_app_generator';
import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';

export const getCommonItemDataOverrides = () => {
  return {
    name: 'some internal app',
    description: 'this app is trusted by the company',
    created_at: new Date('2021-07-01').toISOString(),
  };
};

export const getTrustedAppProvider = () =>
  new TrustedAppGenerator('seed').generate(getCommonItemDataOverrides());

export const getExceptionProvider = () => {
  // cloneDeep needed because exception mock generator uses state across instances
  return cloneDeep(
    getExceptionListItemSchemaMock({
      ...getCommonItemDataOverrides(),
      os_types: ['windows'],
      updated_at: new Date().toISOString(),
      created_by: 'Justa',
      updated_by: 'Mara',
      entries: [
        {
          field: 'process.hash.*',
          operator: 'included',
          type: 'match',
          value: '1234234659af249ddf3e40864e9fb241',
        },
        {
          field: 'process.executable.caseless',
          operator: 'included',
          type: 'match',
          value: '/one/two/three',
        },
      ],
      tags: ['policy:all'],
    })
  );
};
