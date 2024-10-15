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
      '@timestamp': '2021-08-02T14:00:00.000Z',
      user: {
        name: 'test_user',
      },
      entity: {
        name: 'test_user',
        source: ['logs-test'],
      },
    };

    expect(isUserEntity(userEntity)).toBe(true);
  });

  it('should return false if the record is not a UserEntity', () => {
    const nonUserEntity: Entity = {
      '@timestamp': '2021-08-02T14:00:00.000Z',
      host: {
        name: 'test_host',
      },
      entity: {
        name: 'test_host',
        source: ['logs-test'],
      },
    };

    expect(isUserEntity(nonUserEntity)).toBe(false);
  });
});
