/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { IUiSettingsClient } from '@kbn/core/public';
import { getJobsItemsFromEmbeddable } from './utils';
import { createJob } from './create_job';
import { MlApiServices } from '../../../services/ml_api_service';
// import { ML_PAGES, ML_APP_LOCATOR } from '../../../../../common/constants/locator';

export async function createAndSaveJob(
  jobId: string,
  embeddable: Embeddable,
  startJob: boolean,
  share: SharePluginStart,
  dataViewClient: DataViewsContract,
  kibanaConfig: IUiSettingsClient,
  timeFilter: TimefilterContract,
  ml: MlApiServices,
  layerIndex?: number
) {
  const { query, filters, to, from, vis } = getJobsItemsFromEmbeddable(embeddable);
  if (query === undefined || filters === undefined) {
    return;
  }

  const { jobConfig, datafeedConfig, start } = await createJob(
    vis,
    from,
    to,
    query,
    filters,
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

  await ml.addJob({ jobId: job.job_id, job });
  await ml.addDatafeed({ datafeedId, datafeedConfig: datafeed });
  await ml.openJob({ jobId });

  await ml.startDatafeed({ datafeedId, start });
  // console.log(startResp);

  // const locator = share.url.locators.get(ML_APP_LOCATOR);

  // const url = await locator?.getUrl({
  //   page: ML_PAGES.ANOMALY_DETECTION_CREATE_JOB_FROM_LENS,
  //   pageState: {
  //     vis: vis as any,
  //     from,
  //     to,
  //     query,
  //     filters,
  //     filters,
  //     layerIndex,
  //   },
  // });

  // window.open(url, '_blank');
}
