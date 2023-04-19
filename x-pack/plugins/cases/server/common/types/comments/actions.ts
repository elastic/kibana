/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentType } from './common';

export interface ActionsComment {
  type: typeof CommentType.actions;
  comment: string;
  actions: {
    targets: Array<{
      hostname: string;
      endpointId: string;
    }>;
    type: string;
  };
  owner: string;
}
