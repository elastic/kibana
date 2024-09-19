/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Metric } from './metric';

export class ClusterMetric extends Metric {
  constructor(opts) {
    super({
      ...opts,
      uuidField: 'cluster_uuid',
    });
  }
}
