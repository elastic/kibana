/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import { ml } from '../../services/ml_api_service';

export async function exportAnomalyDetectionJobs(jobIds: string[]) {
  const configs = await Promise.all(jobIds.map(ml.jobs.jobForCloning));
  const configsForExport = configs.length === 1 ? configs[0] : configs;
  const blob = new Blob([JSON.stringify(configsForExport, null, 2)], { type: 'application/json' });
  saveAs(blob, 'ml_jobs.json');
}

export async function exportDataframeAnalyticsJobs(jobIds: string[]) {
  const { data_frame_analytics: configs } = await ml.dataFrameAnalytics.getDataFrameAnalytics(
    jobIds.join(','),
    true
  );
  const configsForExport = configs.length === 1 ? configs[0] : configs;
  const blob = new Blob([JSON.stringify(configsForExport, null, 2)], { type: 'application/json' });
  saveAs(blob, 'ml_jobs.json');
}
