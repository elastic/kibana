/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
export { ElasticsearchMetric } from './elasticsearch/classes';
// @ts-ignore
export { KibanaClusterMetric, KibanaMetric } from './kibana/classes';
export type { ApmMetricFields } from './apm/classes';
export { ApmMetric, ApmClusterMetric } from './apm/classes';
// @ts-ignore
export { LogstashClusterMetric, LogstashMetric } from './logstash/classes';
export type { BeatsMetricFields } from './beats/classes';
export { BeatsClusterMetric, BeatsMetric } from './beats/classes';
// @ts-ignore
export { metrics } from './metrics';
