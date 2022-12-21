/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JobType } from '../../../../../common/types/saved_objects';
import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import type { Filter } from '../../../../../common/types/filters';
import type { DataFrameAnalyticsConfig } from '../../../data_frame_analytics/common';

export interface ImportedAdJob {
  job: Job;
  datafeed: Datafeed;
}

export interface JobIdObject {
  jobId: string;
  originalId: string;
  jobIdValid: boolean;
  jobIdInvalidMessage: string;

  jobIdValidated: boolean;

  destIndex?: string;
  originalDestIndex?: string;
  destIndexValid: boolean;
  destIndexInvalidMessage: string;

  destIndexValidated: boolean;
}

export interface SkippedJobs {
  jobId: string;
  missingIndices: string[];
  missingFilters: string[];
}

function isImportedAdJobs(obj: any): obj is ImportedAdJob[] {
  return Array.isArray(obj) && obj.some((o) => o.job && o.datafeed);
}

function isDataFrameAnalyticsConfigs(obj: any): obj is DataFrameAnalyticsConfig[] {
  return Array.isArray(obj) && obj.some((o) => o.dest && o.analysis);
}

export class JobImportService {
  private _readFile(file: File) {
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
  public async readJobConfigs(file: File): Promise<{
    jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[];
    jobIds: string[];
    jobType: JobType | null;
  }> {
    try {
      const json = await this._readFile(file);
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

  public renameAdJobs(jobIds: JobIdObject[], jobs: ImportedAdJob[]) {
    if (jobs.length !== jobs.length) {
      return jobs;
    }

    return jobs.map((j, i) => {
      const { jobId } = jobIds[i];
      j.job.job_id = jobId;
      j.datafeed.job_id = jobId;
      j.datafeed.datafeed_id = `datafeed-${jobId}`;
      return j;
    });
  }

  public renameDfaJobs(jobIds: JobIdObject[], jobs: DataFrameAnalyticsConfig[]) {
    if (jobs.length !== jobs.length) {
      return jobs;
    }

    return jobs.map((j, i) => {
      const { jobId, destIndex } = jobIds[i];
      j.id = jobId;
      if (destIndex !== undefined) {
        j.dest.index = destIndex;
      }
      return j;
    });
  }

  public async validateJobs(
    jobs: ImportedAdJob[] | DataFrameAnalyticsConfig[],
    type: JobType,
    getDataViewTitles: (refresh?: boolean) => Promise<string[]>,
    getFilters: () => Promise<Filter[]>
  ) {
    const existingDataViews = new Set(await getDataViewTitles());
    const existingFilters = new Set((await getFilters()).map((f) => f.filter_id));
    const tempJobs: Array<{ jobId: string; destIndex?: string }> = [];
    const skippedJobs: SkippedJobs[] = [];

    const commonJobs: Array<{
      jobId: string;
      indices: string[];
      filters?: string[];
      destIndex?: string;
    }> =
      type === 'anomaly-detector'
        ? (jobs as ImportedAdJob[]).map((j) => ({
            jobId: j.job.job_id,
            indices: j.datafeed.indices,
            filters: getFilterIdsFromJob(j.job),
          }))
        : (jobs as DataFrameAnalyticsConfig[]).map((j) => ({
            jobId: j.id,
            destIndex: j.dest.index,
            indices: Array.isArray(j.source.index) ? j.source.index : [j.source.index],
          }));

    commonJobs.forEach(({ jobId, indices, filters = [], destIndex }) => {
      const missingIndices = indices.filter((i) => existingDataViews.has(i) === false);
      const missingFilters = filters.filter((i) => existingFilters.has(i) === false);

      if (missingIndices.length === 0 && missingFilters.length === 0) {
        tempJobs.push({
          jobId,
          ...(type === 'data-frame-analytics' ? { destIndex } : {}),
        });
      } else {
        skippedJobs.push({
          jobId,
          missingIndices,
          missingFilters,
        });
      }
    });

    return {
      jobs: tempJobs,
      skippedJobs,
    };
  }
}

function getFilterIdsFromJob(job: Job) {
  const filters = new Set<string>();
  job.analysis_config.detectors.forEach((d) => {
    if (d.custom_rules === undefined) {
      return;
    }
    d.custom_rules.forEach((r) => {
      if (r.scope === undefined) {
        return;
      }
      Object.values(r.scope).forEach((s) => {
        filters.add(s.filter_id);
      });
    });
  });

  return [...filters];
}
