/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JobType } from '../../../../../common/types/saved_objects';
import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import type { DataFrameAnalyticsConfig } from '../../../data_frame_analytics/common';
import type { SkippedJobs } from './cannot_import_jobs_callout';

export interface ImportedAdJob {
  job: Job;
  datafeed: Datafeed;
}

export interface JobId {
  id: string;
  originalId: string;
  valid: boolean;
  invalidMessage: string;
}

function isImportedAdJobs(obj: any): obj is ImportedAdJob[] {
  return Array.isArray(obj) && obj.some((o) => o.job && o.datafeed);
}

function isDataFrameAnalyticsConfigs(obj: any): obj is DataFrameAnalyticsConfig[] {
  return Array.isArray(obj) && obj.some((o) => o.dest && o.analysis);
}

function readFile(file: File) {
  return new Promise((resolve, reject) => {
    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (() => {
        return () => {
          const data = reader.result;
          if (typeof data === 'string') {
            try {
              const json = JSON.parse(data);
              resolve(json);
            } catch (error) {
              reject();
            }
          } else {
            reject();
          }
        };
      })();
    } else {
      reject();
    }
  });
}
export async function readJobConfigs(
  file: File
): Promise<{
  jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[];
  jobIds: string[];
  jobType: JobType | null;
}> {
  try {
    const json = await readFile(file);
    const jobs = Array.isArray(json) ? json : [json];

    if (isImportedAdJobs(jobs)) {
      const jobIds = jobs.map((j) => j.job.job_id);
      return { jobs, jobIds, jobType: 'anomaly-detector' };
    } else if (isDataFrameAnalyticsConfigs(jobs)) {
      const jobIds = jobs.map((j) => j.id);
      return { jobs, jobIds, jobType: 'data-frame-analytics' };
    } else {
      return { jobs: [], jobIds: [], jobType: null };
    }
  } catch (error) {
    return { jobs: [], jobIds: [], jobType: null };
  }
}

export function renameAdJobs(jobIds: JobId[], jobs: ImportedAdJob[]) {
  if (jobs.length !== jobs.length) {
    return jobs;
  }

  return jobs.map((j, i) => {
    const { id } = jobIds[i];
    j.job.job_id = id;
    j.datafeed.job_id = id;
    j.datafeed.datafeed_id = `datafeed-${id}`;
    return j;
  });
}

export function renameDfaJobs(jobIds: JobId[], jobs: DataFrameAnalyticsConfig[]) {
  if (jobs.length !== jobs.length) {
    return jobs;
  }

  return jobs.map((j, i) => {
    const { id } = jobIds[i];
    j.id = id;
    return j;
  });
}

export async function validateJobs(
  jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[],
  type: JobType,
  getIndexPatternTitles: (refresh?: boolean) => Promise<string[]>
) {
  const existingIndexPatterns = new Set(await getIndexPatternTitles());
  const tempJobIds: string[] = [];
  const tempSkippedJobIds: SkippedJobs[] = [];

  const commonJobs: Array<{ jobId: string; indices: string[] }> =
    type === 'anomaly-detector'
      ? (jobs as ImportedAdJob[]).map((j) => ({
          jobId: j.job.job_id,
          indices: j.datafeed.indices,
        }))
      : (jobs as DataFrameAnalyticsConfig[]).map((j) => ({
          jobId: j.id,
          indices: Array.isArray(j.source.index) ? j.source.index : [j.source.index],
        }));

  commonJobs.forEach(({ jobId, indices }) => {
    const missingIndices = indices.filter((i) => existingIndexPatterns.has(i) === false);
    if (missingIndices.length === 0) {
      tempJobIds.push(jobId);
    } else {
      tempSkippedJobIds.push({
        jobId,
        missingIndices,
      });
    }
  });

  return {
    jobIds: tempJobIds,
    skippedJobs: tempSkippedJobIds,
  };
}
