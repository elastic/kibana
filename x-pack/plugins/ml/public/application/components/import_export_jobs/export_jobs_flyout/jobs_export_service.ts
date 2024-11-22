/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import type { MlApi } from '../../../services/ml_api_service';
import type { JobType } from '../../../../../common/types/saved_objects';
import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import { GLOBAL_CALENDAR } from '../../../../../common/constants/calendars';

export type JobDependencies = Array<{ jobId: string; calendarIds: string[]; filterIds: string[] }>;
export type FiltersPerJob = Array<{ jobId: string; filterIds: string[] }>;

type ExportableConfigs =
  | Array<
      | {
          job?: Job;
          datafeed?: Datafeed;
        }
      | undefined
    >
  | DataFrameAnalyticsConfig[];

export class JobsExportService {
  constructor(private _mlApi: MlApi) {}

  public async exportAnomalyDetectionJobs(jobIds: string[]) {
    const configs = await Promise.all(jobIds.map((id) => this._mlApi.jobs.jobForCloning(id, true)));
    this._export(configs, 'anomaly-detector');
  }

  public async exportDataframeAnalyticsJobs(jobIds: string[]) {
    const { data_frame_analytics: configs } =
      await this._mlApi.dataFrameAnalytics.getDataFrameAnalytics(jobIds.join(','), true);
    this._export(configs, 'data-frame-analytics');
  }

  private _export(configs: ExportableConfigs, jobType: JobType) {
    const configsForExport = configs.length === 1 ? configs[0] : configs;
    const blob = new Blob([JSON.stringify(configsForExport, null, 2)], {
      type: 'application/json',
    });
    const fileName = this._createFileName(jobType);
    saveAs(blob, fileName);
  }

  private _createFileName(jobType: JobType) {
    return (
      (jobType === 'anomaly-detector' ? 'anomaly_detection' : 'data_frame_analytics') + '_jobs.json'
    );
  }

  public async getJobDependencies(jobs: Job[]): Promise<JobDependencies> {
    const calendars = await this._mlApi.calendars();

    // create a map of all jobs in groups
    const groups = jobs.reduce((acc, cur) => {
      if (Array.isArray(cur.groups)) {
        cur.groups.forEach((g) => {
          if (acc[g] === undefined) {
            acc[g] = [];
          }
          acc[g].push(cur.job_id);
        });
      }
      return acc;
    }, {} as Record<string, string[]>);

    const isGroup = (id: string) => groups[id] !== undefined;

    // create a map of all calendars in jobs
    const calendarsPerJob = calendars.reduce((acc, cur) => {
      cur.job_ids.forEach((jId) => {
        if (jId === GLOBAL_CALENDAR) {
          // add the calendar to all jobs
          jobs.forEach((j) => {
            if (acc[j.job_id] === undefined) {
              acc[j.job_id] = [];
            }
            acc[j.job_id].push(cur.calendar_id);
          });
        } else if (isGroup(jId)) {
          // add the calendar to every job in this group
          groups[jId].forEach((jId2) => {
            if (acc[jId2] === undefined) {
              acc[jId2] = [];
            }
            acc[jId2].push(cur.calendar_id);
          });
        } else {
          // add the calendar to just this job
          if (acc[jId] === undefined) {
            acc[jId] = [];
          }
          acc[jId].push(cur.calendar_id);
        }
      });
      return acc;
    }, {} as Record<string, string[]>);

    // create a map of all filters in jobs,
    // by extracting the filters from the job's detectors
    const filtersPerJob = jobs.reduce((acc, cur) => {
      if (acc[cur.job_id] === undefined) {
        acc[cur.job_id] = [];
      }
      cur.analysis_config.detectors.forEach((d) => {
        if (d.custom_rules !== undefined) {
          d.custom_rules.forEach((r) => {
            if (r.scope !== undefined) {
              Object.values(r.scope).forEach((scope) => {
                acc[cur.job_id].push(scope.filter_id);
              });
            }
          });
        }
      });
      return acc;
    }, {} as Record<string, string[]>);

    return jobs.map((j) => {
      const jobId = j.job_id;
      return {
        jobId,
        calendarIds: [...new Set(calendarsPerJob[jobId])] ?? [],
        filterIds: [...new Set(filtersPerJob[jobId])] ?? [],
      };
    });
  }
}
