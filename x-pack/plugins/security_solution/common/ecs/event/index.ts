/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface EventEcs {
  action?: string[];

  category?: string[];

  code?: string[];

  created?: string[];

  dataset?: string[];

  duration?: number[];

  end?: string[];

  hash?: string[];

  id?: string[];

  kind?: string[];

  module?: string[];

  original?: string[];

  outcome?: string[];

  risk_score?: number[];

  risk_score_norm?: number[];

  severity?: number[];

  start?: string[];

  timezone?: string[];

  type?: string[];
}
