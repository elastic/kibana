/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext } from 'react';

// import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPage,
  EuiPageBody,
  EuiPageContentBody,
  // EuiPageContentHeader,
  // EuiPageContentHeaderSection,
  EuiSpacer,
  // EuiTitle,
} from '@elastic/eui';
import { Wizard } from './wizard';
import { SingleMetricJobCreator /* , MultiMetricJobCreator*/ } from '../../common/job_creator';
import { ChartLoader } from '../../common/chart_loader';
import { ResultsLoader } from '../../common/results_loader';
import { KibanaContext, isKibanaContext } from '../../../../data_frame/common/kibana_context';
import { getTimeFilterRange } from '../../../../components/full_time_range_selector';
import { MlTimeBuckets } from '../../../../util/ml_time_buckets';

const PAGE_WIDTH = 1200; // document.querySelector('.single-metric-job-container').width();
const BAR_TARGET = PAGE_WIDTH > 2000 ? 1000 : PAGE_WIDTH / 2;
const MAX_BARS = BAR_TARGET + (BAR_TARGET / 100) * 100; // 100% larger than bar target

// import { Wizard } from './wizard';

export const Page: FC = () => {
  const kibanaContext = useContext(KibanaContext);
  if (!isKibanaContext(kibanaContext)) {
    return null;
  }
  const jobCreator = new SingleMetricJobCreator(
    kibanaContext.currentIndexPattern,
    kibanaContext.currentSavedSearch,
    kibanaContext.combinedQuery
  );
  jobCreator.bucketSpan = '15m';
  const { from, to } = getTimeFilterRange();
  jobCreator.setTimeRange(from, to);
  jobCreator.modelPlot = true;

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

  // console.log('Page rendering');

  return (
    <EuiPage>
      <EuiPageBody>
        {/* <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
        <EuiTitle>
        <h1>
        <FormattedMessage
        id="xpack.ml.newJob.wizard.jobType.newJob"
        defaultMessage="New job"
        />
        </h1>
        </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader> */}
        <EuiPageContentBody>
          <EuiSpacer size="l" />
          <Wizard
            jobCreator={jobCreator}
            chartLoader={chartLoader}
            resultsLoader={resultsLoader}
            chartInterval={chartInterval}
          />
        </EuiPageContentBody>
      </EuiPageBody>
    </EuiPage>
  );
};
