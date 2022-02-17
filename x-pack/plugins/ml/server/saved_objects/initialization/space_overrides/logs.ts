/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import RE2 from 're2';
import { mlLog } from '../../../lib/log';

const GROUP = 'logs-ui';
const MODULE_PREFIX = 'kibana-logs-ui';
const SOURCES = ['default', 'internal-stack-monitoring'];
const JOB_IDS = ['log-entry-rate', 'log-entry-categories-count'];

// jobs created by the logs plugin will be in the logs-ui group
// they contain the a space name in the job id, and so the id can be parsed
// and the job assigned to the correct space.
export async function logJobsSpaces({
  asInternalUser,
}: IScopedClusterClient): Promise<Array<{ id: string; space: string }>> {
  try {
    const body = await asInternalUser.ml.getJobs({
      job_id: GROUP,
    });
    if (body.jobs.length === 0) {
      return [];
    }

    const findLogJobSpace = findLogJobSpaceFactory();
    return body.jobs
      .map((j) => ({ id: j.job_id, space: findLogJobSpace(j.job_id) }))
      .filter((j) => j.space !== null) as Array<{ id: string; space: string }>;
  } catch ({ body }) {
    if (body.status !== 404) {
      // 404s are expected if there are no logs-ui jobs
      mlLog.error(`Error Initializing Logs job ${JSON.stringify(body)}`);
    }
  }
  return [];
}

function findLogJobSpaceFactory() {
  const reg = new RE2(`${MODULE_PREFIX}-(.+)-(${SOURCES.join('|')})-(${JOB_IDS.join('|')})`);

  return (jobId: string) => {
    const result = reg.exec(jobId);
    if (result === null) {
      return null;
    }
    return result[1] ?? null;
  };
}
