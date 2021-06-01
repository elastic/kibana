/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-expect-error
import { saveAs } from '@elastic/filesaver';
import { ml } from '../../services/ml_api_service';

export function loadJobForCloning(jobId: string) {
  return new Promise((resolve, reject) => {
    ml.jobs
      .jobForCloning(jobId)
      .then((resp) => {
        if (resp) {
          resolve(resp);
        } else {
          throw new Error(`Could not find job ${jobId}`);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

export async function exportJobs(jobIds: string[]) {
  const configs = await Promise.all(jobIds.map(loadJobForCloning));
  const configsForExport = configs.length === 1 ? configs[0] : configs;
  const blob = new Blob([JSON.stringify(configsForExport, null, 2)], { type: 'application/json' });
  saveAs(blob, 'ml_jobs.json');
}
