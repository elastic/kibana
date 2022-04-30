/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { Metric } from '../classes';

export class EnterpriseSearchMetric extends Metric {
  // @ts-ignore
  constructor(opts) {
    super({
      ...opts,
      app: 'enterprise_search',
      ...EnterpriseSearchMetric.getMetricFields(),
    });
  }

  static getMetricFields() {
    return {
      uuidField: 'enterprisesearch.cluster_uuid',
      timestampField: '@timestamp',
    };
  }
}

export type EnterpriseSearchMetricFields = ReturnType<
  typeof EnterpriseSearchMetric.getMetricFields
>;
