/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { getDataViewAndSavedSearch } from '../../util/index_utils';
import { JobType } from '../../../../common/types/saved_objects';
import { newJobCapsServiceAnalytics } from './new_job_capabilities_service_analytics';
import { newJobCapsService } from './new_job_capabilities_service';

export const ANOMALY_DETECTOR = 'anomaly-detector';
export const DATA_FRAME_ANALYTICS = 'data-frame-analytics';

// called in the routing resolve block to initialize the NewJobCapabilites
// service for the corresponding job type with the currently selected data view
export function loadNewJobCapabilities(
  dataViewId: string,
  savedSearchId: string,
  dataViewContract: DataViewsContract,
  jobType: JobType
) {
  return new Promise(async (resolve, reject) => {
    try {
      const serviceToUse =
        jobType === ANOMALY_DETECTOR ? newJobCapsService : newJobCapsServiceAnalytics;

      if (dataViewId !== undefined) {
        // index pattern is being used
        const dataView: DataView = await dataViewContract.get(dataViewId);
        await serviceToUse.initializeFromDataVIew(dataView);
        resolve(serviceToUse.newJobCaps);
      } else if (savedSearchId !== undefined) {
        // saved search is being used
        // load the data view from the saved search
        const { dataView } = await getDataViewAndSavedSearch(savedSearchId);

        if (dataView === null) {
          // eslint-disable-next-line no-console
          console.error('Cannot retrieve data view from saved search');
          reject();
          return;
        }

        await serviceToUse.initializeFromDataVIew(dataView);
        resolve(serviceToUse.newJobCaps);
      } else {
        reject();
      }
    } catch (error) {
      reject(error);
    }
  });
}
