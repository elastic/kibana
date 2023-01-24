/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedPolicy } from '../../../common/types';
import { defaultRolloverAction } from '../constants';

export const isUsingDefaultRollover = (policy: SerializedPolicy): boolean => {
  const rollover = policy?.phases?.hot?.actions?.rollover;
  return Boolean(
    rollover &&
      rollover.max_age === defaultRolloverAction.max_age &&
      rollover.max_docs === defaultRolloverAction.max_docs &&
      rollover.max_primary_shard_size === defaultRolloverAction.max_primary_shard_size &&
      rollover.max_primary_shard_docs === defaultRolloverAction.max_primary_shard_docs
  );
};
