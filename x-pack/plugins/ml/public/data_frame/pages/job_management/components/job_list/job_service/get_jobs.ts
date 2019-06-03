/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { ml } from '../../../../../../services/ml_api_service';
import {
  DataFrameJob,
  DataFrameJobListRow,
  DataFrameJobState,
  DataFrameJobStats,
  JobId,
} from '../common';

interface DataFrameJobStateStats {
  id: JobId;
  state: DataFrameJobState;
  stats: DataFrameJobStats;
}

interface GetDataFrameTransformsResponse {
  count: number;
  transforms: DataFrameJob[];
}

interface GetDataFrameTransformsStatsResponse {
  count: number;
  transforms: DataFrameJobStateStats[];
}

export type GetJobs = (forceRefresh?: boolean) => void;

export const getJobsFactory = (
  setDataFrameJobs: React.Dispatch<React.SetStateAction<DataFrameJobListRow[]>>,
  blockRefresh: boolean
): GetJobs => async (forceRefresh = false) => {
  if (forceRefresh === true || blockRefresh === false) {
    try {
      const jobConfigs: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransforms();
      const jobStats: GetDataFrameTransformsStatsResponse = await ml.dataFrame.getDataFrameTransformsStats();

      const tableRows = jobConfigs.transforms.reduce(
        (reducedtableRows, config) => {
          const stats = jobStats.transforms.find(d => config.id === d.id);

          // A newly created job might not have corresponding stats yet.
          // If that's the case we just skip the job and don't add it to the jobs list yet.
          if (stats === undefined) {
            return reducedtableRows;
          }
          // Table with expandable rows requires `id` on the outer most level
          reducedtableRows.push({ config, id: config.id, state: stats.state, stats: stats.stats });
          return reducedtableRows;
        },
        [] as DataFrameJobListRow[]
      );

      setDataFrameJobs(tableRows);
    } catch (e) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.dataframe.jobsList.errorGettingDataFrameJobsList', {
          defaultMessage: 'An error occurred getting the data frame jobs list: {error}',
          values: { error: JSON.stringify(e) },
        })
      );
    }
  }
};
