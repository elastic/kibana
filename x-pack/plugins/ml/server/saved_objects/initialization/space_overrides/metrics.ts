/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import RE2 from 're2';
import { mlLog } from '../../../lib/log';

const GROUP = 'metrics';
const MODULE_PREFIX = 'kibana-metrics-ui';
const SOURCES = ['default', 'internal-stack-monitoring'];
const JOB_IDS = [
  'k8s_memory_usage',
  'k8s_network_in',
  'k8s_network_out',
  'hosts_memory_usage',
  'hosts_network_in',
  'hosts_network_out',
];

// jobs created by the logs plugin will be in the metrics group
// they contain the a space name in the job id, and so the id can be parsed
// and the job assigned to the correct space.
export async function metricsJobsSpaces({
  asInternalUser,
}: IScopedClusterClient): Promise<Array<{ id: string; space: string }>> {
  try {
    const body = await asInternalUser.ml.getJobs({
      job_id: GROUP,
    });
    if (body.jobs.length === 0) {
      return [];
    }

    const findMetricJobSpace = findMetricsJobSpaceFactory();
    return body.jobs
      .map((j) => ({ id: j.job_id, space: findMetricJobSpace(j.job_id) }))
      .filter((j) => j.space !== null) as Array<{ id: string; space: string }>;
  } catch ({ body }) {
    if (body.status !== 404) {
      // 404s are expected if there are no metrics jobs
      mlLog.error(`Error Initializing Metrics job ${JSON.stringify(body)}`);
    }
  }
  return [];
}

function findMetricsJobSpaceFactory() {
  const reg = new RE2(`${MODULE_PREFIX}-(.+)-(${SOURCES.join('|')})-(${JOB_IDS.join('|')})`);

  return (jobId: string) => {
    const result = reg.exec(jobId);
    if (result === null) {
      return null;
    }
    return result[1] ?? null;
  };
}
