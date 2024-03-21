/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { dump } from 'js-yaml';
import { validateHealthInterval } from '../detection_engine_health/health_interval';
import type { IDetectionEngineHealthClient } from '../../logic/detection_engine_health';

export async function prepareAiReadyRuleMonitoringStats(
  healthClient: IDetectionEngineHealthClient
): Promise<string> {
  const now = moment();
  const interval = validateHealthInterval(undefined, now);
  const clusterHealth = await healthClient.calculateClusterHealth({
    interval,
    num_of_top_rules: 10,
  });
  const result: string[] = [];

  result.push(
    'Cluster state at the current moment:',
    dump(normalize(clusterHealth.state_at_the_moment))
  );
  result.push();

  result.push(
    `Cluster state over interval from ${interval.from} to ${interval.to}:`,
    dump(normalize(clusterHealth.stats_over_interval))
  );
  result.push();

  result.push(
    `Cluster state history over interval from ${interval.from} to ${interval.to} with ${interval.granularity} granularity:`,
    dump(normalize(clusterHealth.history_over_interval))
  );
  result.push();

  return result.join('\n');
}

/**
 * Normalizes a value by remove keys with undefined values
 */
function normalize<T extends unknown>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
