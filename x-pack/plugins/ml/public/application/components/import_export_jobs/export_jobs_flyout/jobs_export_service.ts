/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import type { MlApiServices } from '../../../services/ml_api_service';
import type { JobType } from '../../../../../common/types/saved_objects';
import type { Job, Datafeed } from '../../../../../common/types/anomaly_detection_jobs';
import type { DataFrameAnalyticsConfig } from '../../../../../common/types/data_frame_analytics';

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
  constructor(private _mlApiServices: MlApiServices) {}

  public async exportAnomalyDetectionJobs(jobIds: string[]) {
    const configs = await Promise.all(jobIds.map(this._mlApiServices.jobs.jobForCloning));
    this._export(configs, 'anomaly-detector');
  }

  public async exportDataframeAnalyticsJobs(jobIds: string[]) {
    const {
      data_frame_analytics: configs,
    } = await this._mlApiServices.dataFrameAnalytics.getDataFrameAnalytics(jobIds.join(','), true);
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
}
