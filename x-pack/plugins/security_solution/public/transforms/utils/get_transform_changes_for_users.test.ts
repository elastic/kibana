/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersQueries } from '../../../common/search_strategy';
import { getTransformChangesForUsers } from './get_transform_changes_for_users';
import { getTransformConfigSchemaMock } from './transform_config_schema.mock';

/** Get the return type of getTransformChangesForUsers for TypeScript checks against expected */
type ReturnTypeGetTransformChangesForUsers = ReturnType<typeof getTransformChangesForUsers>;

describe('get_transform_changes_for_user', () => {
  test('it gets a transform change for authentications', () => {
    expect(
      getTransformChangesForUsers({
        factoryQueryType: UsersQueries.authentications,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForUsers>({
      factoryQueryType: UsersQueries.authenticationsEntities,
      indices: ['.estc_all_user_ent*'],
    });
  });

  test('it returns an "undefined" for another value', () => {
    expect(
      getTransformChangesForUsers({
        factoryQueryType: UsersQueries.details,
        settings: getTransformConfigSchemaMock().settings[0],
      })
    ).toEqual<ReturnTypeGetTransformChangesForUsers>(undefined);
  });
});
