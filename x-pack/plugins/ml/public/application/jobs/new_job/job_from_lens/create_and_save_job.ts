/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Embeddable } from '@kbn/lens-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getJobsItemsFromEmbeddable } from './utils';
import { createJob } from './create_job';
import { MlApiServices } from '../../../services/ml_api_service';
import type { ErrorType } from '../../../../../common/util/errors';

interface State {
  success: boolean;
  error?: ErrorType;
}

interface CreateState {
  jobCreated: State;
  datafeedCreated: State;
  jobOpened: State;
  datafeedStarted: State;
}

export async function createAndSaveJob(
  jobId: string,
  bucketSpan: string,
  embeddable: Embeddable,
  startJob: boolean,
  runInRealTime: boolean,
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient,
  timeFilter: TimefilterContract,
  ml: MlApiServices,
  layerIndex?: number
): Promise<CreateState> {
  const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
  if (query === undefined || filters === undefined) {
    throw new Error('Cannot create job, query and filters are undefined');
  }

  const { jobConfig, datafeedConfig, start, end } = await createJob(
    vis,
    from,
    to,
    query,
    filters,
    bucketSpan,
    dataViewClient,
    kibanaConfig,
    timeFilter,
    layerIndex
  );
  const job = {
    ...jobConfig,
    job_id: jobId,
  };
  const datafeedId = `datafeed-${jobId}`;
  const datafeed = { ...datafeedConfig, job_id: jobId, datafeed_id: datafeedId };

  const result: CreateState = {
    jobCreated: { success: false },
    datafeedCreated: { success: false },
    jobOpened: { success: false },
    datafeedStarted: { success: false },
  };

  try {
    await ml.addJob({ jobId: job.job_id, job });
  } catch (error) {
    result.jobCreated.error = error;
    return result;
  }
  result.jobCreated.success = true;

  try {
    await ml.addDatafeed({ datafeedId, datafeedConfig: datafeed });
  } catch (error) {
    result.datafeedCreated.error = error;
    return result;
  }
  result.datafeedCreated.success = true;

  if (startJob) {
    try {
      await ml.openJob({ jobId });
    } catch (error) {
      // job may already be open, so ignore 409 error.
      if (error.body.statusCode !== 409) {
        result.jobOpened.error = error;
        return result;
      }
    }
    result.jobOpened.success = true;

    try {
      await ml.startDatafeed({ datafeedId, start, ...(runInRealTime ? {} : { end }) });
    } catch (error) {
      result.datafeedStarted.error = error;
      return result;
    }
    result.datafeedStarted.success = true;
  }

  return result;
}
