/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { AnomalyResultsViewSelector } from '../components/anomaly_results_view_selector';
import { JobSelector } from '../components/job_selector';

import { HelpMenu } from '../components/help_menu';
import { useMlKibana } from '../contexts/kibana';
import { MlPageHeader } from '../components/page_header';

interface TimeSeriesExplorerPageProps {
  dateFormatTz: string;
  resizeRef?: any;
  noSingleMetricJobsFound?: boolean;
}

export const TimeSeriesExplorerPage: FC<TimeSeriesExplorerPageProps> = ({
  children,
  dateFormatTz,
  resizeRef,
  noSingleMetricJobsFound,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.anomalyDetection;
  return (
    <>
      <div
        className="ml-time-series-explorer"
        ref={resizeRef}
        data-test-subj="mlPageSingleMetricViewer"
      >
        <MlPageHeader>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <AnomalyResultsViewSelector viewId="timeseriesexplorer" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.ml.timeSeriesExplorer.pageTitle"
                defaultMessage="Single Metric Viewer"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </MlPageHeader>

        {noSingleMetricJobsFound ? null : (
          <JobSelector dateFormatTz={dateFormatTz} singleSelection={true} timeseriesOnly={true} />
        )}

        {children}
        <HelpMenu docLink={helpLink} />
      </div>
    </>
  );
};
