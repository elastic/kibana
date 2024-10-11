/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isUserEntity } from './helpers';
import type {
  Entity,
  UserEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

describe('isUserEntity', () => {
  it('should return true if the record is a UserEntity', () => {
    const userEntity: UserEntity = {
      user: {
        name: 'test_user',
      },
    };

    expect(isUserEntity(userEntity)).toBe(true);
  });

  it('should return false if the record is not a UserEntity', () => {
    const nonUserEntity: Entity = {
      host: {
        name: 'test_host',
      },
    };

    expect(isUserEntity(nonUserEntity)).toBe(false);
  });
});
