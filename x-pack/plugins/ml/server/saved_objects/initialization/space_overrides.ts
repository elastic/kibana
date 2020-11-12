/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IScopedClusterClient } from 'kibana/server';
import RE2 from 're2';
import { Job } from '../../../common/types/anomaly_detection_jobs';
import type { JobSpaceOverrides } from '../repair';
import { mlLog } from '../../lib/log';

// create a list of jobs and specific spaces to place them in
// when the are being initialized.
export async function createJobSpaceOverrides(
  clusterClient: IScopedClusterClient
): Promise<JobSpaceOverrides> {
  const spaceOverrides: JobSpaceOverrides = {
    overrides: {
      'anomaly-detector': {},
      'data-frame-analytics': {},
    },
  };
  (await logJobsSpaces(clusterClient)).forEach(
    (o) => (spaceOverrides.overrides['anomaly-detector'][o.id] = [o.space])
  );
  return spaceOverrides;
}

// jobs created by the logs plugin will be in the logs-ui group
// they contain the a space name in the job id, and so the id can be parsed
// and the job assigned to the correct space.
async function logJobsSpaces({
  asInternalUser,
}: IScopedClusterClient): Promise<Array<{ id: string; space: string }>> {
  try {
    const { body } = await asInternalUser.ml.getJobs<{ jobs: Job[] }>({
      job_id: 'logs-ui',
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
  const sources = ['default', 'internal-stack-monitoring'];
  const jobIds = ['log-entry-rate', 'log-entry-categories-count'];
  const reg = new RE2(`kibana-logs-ui-(.+)-(${sources.join('|')})-(${jobIds.join('|')})`);

  return (jobId: string) => {
    const result = reg.exec(jobId);
    if (result === null) {
      return null;
    }
    return result[1] ?? null;
  };
}
