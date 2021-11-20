/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from 'kibana/public';
import type { DataViewsContract } from '../../../../../../../../../src/plugins/data_views/public';
import { mlJobService } from '../../../../services/job_service';
import { Datafeed } from '../../../../../../common/types/anomaly_detection_jobs';
import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../../../common/constants/new_job';

export async function preConfiguredJobRedirect(
  dataViewsContract: DataViewsContract,
  basePath: string,
  navigateToUrl: ApplicationStart['navigateToUrl']
) {
  const { createdBy, job, datafeed } = mlJobService.tempJobCloningObjects;

  if (job && datafeed) {
    const dataViewId = await getDataViewIdFromName(datafeed, dataViewsContract);
    if (dataViewId === null) {
      return Promise.resolve();
    }

    try {
      const redirectUrl = await getWizardUrlFromCloningJob(createdBy, dataViewId);
      await navigateToUrl(`${basePath}/app/ml/${redirectUrl}`);
      return Promise.reject();
    } catch (error) {
      return Promise.resolve();
    }
  } else {
    // no job to clone
    // don't redirect
    return Promise.resolve();
  }
}

async function getWizardUrlFromCloningJob(createdBy: string | undefined, dataViewId: string) {
  const created = createdBy;
  let page = '';

  switch (created) {
    case CREATED_BY_LABEL.SINGLE_METRIC:
      page = JOB_TYPE.SINGLE_METRIC;
      break;
    case CREATED_BY_LABEL.MULTI_METRIC:
      page = JOB_TYPE.MULTI_METRIC;
      break;
    case CREATED_BY_LABEL.POPULATION:
      page = JOB_TYPE.POPULATION;
      break;
    case CREATED_BY_LABEL.CATEGORIZATION:
      page = JOB_TYPE.CATEGORIZATION;
      break;
    case CREATED_BY_LABEL.RARE:
      page = JOB_TYPE.RARE;
      break;
    default:
      page = JOB_TYPE.ADVANCED;
      break;
  }

  return `jobs/new_job/${page}?index=${dataViewId}&_g=()`;
}

async function getDataViewIdFromName(
  datafeed: Datafeed,
  dataViewsContract: DataViewsContract
): Promise<string | null> {
  if (dataViewsContract === null) {
    throw new Error('Data views are not initialized!');
  }

  const [dv] = await dataViewsContract?.find(datafeed.indices.join(','));
  if (!dv) {
    return null;
  }
  return dv.id ?? dv.title;
}
