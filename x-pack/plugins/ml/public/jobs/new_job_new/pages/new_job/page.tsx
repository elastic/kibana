/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, Fragment } from 'react';

import { EuiPage, EuiPageBody, EuiPageContentBody, EuiSpacer } from '@elastic/eui';
import { Wizard } from './wizard';
import { jobCreatorFactory } from '../../common/job_creator';
import { JOB_TYPE } from '../../common/job_creator/util/constants';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { KibanaContext, isKibanaContext } from '../../../../data_frame/common/kibana_context';
import { getTimeFilterRange } from '../../../../components/full_time_range_selector';
import { MlTimeBuckets } from '../../../../util/ml_time_buckets';

const PAGE_WIDTH = 1200; // document.querySelector('.single-metric-job-container').width();
const BAR_TARGET = PAGE_WIDTH > 2000 ? 1000 : PAGE_WIDTH / 2;
const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target

export interface PageProps {
  existingJobsAndGroups: any;
  jobType: JOB_TYPE;
}

export const Page: FC<PageProps> = ({ existingJobsAndGroups, jobType }) => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }

  const jobCreator = jobCreatorFactory(jobType)(
    kibanaContext.currentIndexPattern,
    kibanaContext.currentSavedSearch,
    kibanaContext.combinedQuery
  );
  jobCreator.bucketSpan = '15m';
  const { from, to } = getTimeFilterRange();
  jobCreator.setTimeRange(from, to);

  if (jobType === JOB_TYPE.SINGLE_METRIC) {
    jobCreator.modelPlot = true;
  }

  const chartInterval = new MlTimeBuckets();
  chartInterval.setBarTarget(BAR_TARGET);
  chartInterval.setMaxBars(MAX_BARS);
  chartInterval.setInterval('auto');

  const chartLoader = new ChartLoader(
    kibanaContext.currentIndexPattern,
    kibanaContext.currentSavedSearch,
    kibanaContext.combinedQuery
  );

  const resultsLoader = new ResultsLoader(jobCreator, chartInterval);

  useEffect(() => {
    return () => {
      jobCreator.forceStopRefreshPolls();
    };
  });

  return (
    <Fragment>
      <EuiPage style={{ backgroundColor: '#FFF' }}>
        <EuiPageBody>
          <EuiPageContentBody>
            <EuiSpacer size="l" />
            <Wizard
              jobCreator={jobCreator}
              chartLoader={chartLoader}
              resultsLoader={resultsLoader}
              chartInterval={chartInterval}
              existingJobsAndGroups={existingJobsAndGroups}
            />
          </EuiPageContentBody>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
};
