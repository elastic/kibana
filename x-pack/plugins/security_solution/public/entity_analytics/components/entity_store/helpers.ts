/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ASSET_CRITICALITY_INDEX_PATTERN,
  RISK_SCORE_INDEX_PATTERN,
} from '../../../../common/constants';
import type {
  Entity,
  UserEntity,
} from '../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntitySourceTag } from './types';

export const isUserEntity = (record: Entity): record is UserEntity =>
  !!(record as UserEntity)?.user;

export const sourceFieldToTag = (source: string): EntitySourceTag => {
  if (source.match(`^${RISK_SCORE_INDEX_PATTERN}`)) {
    return EntitySourceTag.risk;
  }

  if (source.match(`^${ASSET_CRITICALITY_INDEX_PATTERN}`)) {
    return EntitySourceTag.criticality;
  }

  return EntitySourceTag.events;
};
