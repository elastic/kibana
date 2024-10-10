/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SerializedPolicy, RolloverAction } from '../../../common/types';

export const defaultIndexPriority = {
  hot: '100',
  warm: '50',
  cold: '0',
};

export const defaultRolloverAction: RolloverAction = {
  max_age: '30d',
  max_primary_shard_size: '50gb',
};

export const defaultPolicy: SerializedPolicy = {
  name: '',
  phases: {
    hot: {
      actions: {
        rollover: defaultRolloverAction,
      },
    },
  },
};
