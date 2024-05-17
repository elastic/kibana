/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../../../common/constants';
import type { JoinDescriptor } from '../../../common/descriptor_types';

export function isSpatialJoin(joinDescriptor: Partial<JoinDescriptor>) {
  return joinDescriptor?.right?.type === SOURCE_TYPES.ES_DISTANCE_SOURCE;
}
