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

export const getJobsFactory = (
  setDataFrameJobs: React.Dispatch<React.SetStateAction<DataFrameJobListRow[]>>
) => async () => {
  try {
    const jobConfigs: GetDataFrameTransformsResponse = await ml.dataFrame.getDataFrameTransforms();
    const jobStats: GetDataFrameTransformsStatsResponse = await ml.dataFrame.getDataFrameTransformsStats();

    const tableRows = jobConfigs.transforms.map(config => {
      const stats = jobStats.transforms.find(d => config.id === d.id);

      if (stats === undefined) {
        throw new Error('job stats not available');
      }

      // table with expandable rows requires `id` on the outer most level
      return { config, id: config.id, state: stats.state, stats: stats.stats };
    });

    setDataFrameJobs(tableRows);
  } catch (e) {
    toastNotifications.addDanger(
      i18n.translate('xpack.ml.dataframe.jobsList.errorGettingDataFrameJobsList', {
        defaultMessage: 'An error occurred getting the data frame jobs list: {error}',
        values: { error: JSON.stringify(e) },
      })
    );
  }
};
