/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommentType } from './common';

export interface AlertComment {
  type: typeof CommentType.alert;
  alertId: string | string[];
  index: string | string[];
  rule: {
    id: string | null;
    name: string | null;
  };
  owner: string;
}
