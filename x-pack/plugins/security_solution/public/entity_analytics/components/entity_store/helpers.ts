/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Entity,
  UserEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';

export const isUserEntity = (record: Entity): record is UserEntity =>
  !!(record as UserEntity)?.user;
