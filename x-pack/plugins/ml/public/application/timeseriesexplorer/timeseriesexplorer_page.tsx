/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { FormattedMessage } from '@kbn/i18n/react';

import { EuiPage, EuiPageBody, EuiProgress, EuiScreenReaderOnly } from '@elastic/eui';

import { JobSelector } from '../components/job_selector';
import { NavigationMenu } from '../components/navigation_menu';

interface TimeSeriesExplorerPageProps {
  dateFormatTz: string;
  loading?: boolean;
  resizeRef?: any;
}

export const TimeSeriesExplorerPage: FC<TimeSeriesExplorerPageProps> = ({
  children,
  dateFormatTz,
  loading,
  resizeRef,
}) => {
  return (
    <>
      <NavigationMenu tabId="timeseriesexplorer" />
      {/* Show animated progress bar while loading */}
      {loading === true && (
        <EuiProgress className="mlTimeSeriesExplorerProgress" color="primary" size="xs" />
      )}
      {/* Show a progress bar with progress 0% when not loading.
        If we'd just show no progress bar when not loading it would result in a flickering height effect. */}
      {loading === false && (
        <EuiProgress
          className="mlTimeSeriesExplorerProgress"
          value={0}
          max={100}
          color="primary"
          size="xs"
        />
      )}
      <JobSelector dateFormatTz={dateFormatTz} singleSelection={true} timeseriesOnly={true} />
      <div
        className="ml-time-series-explorer"
        ref={resizeRef}
        data-test-subj="mlPageSingleMetricViewer"
      >
        <EuiPage style={{ padding: '0px', background: 'none' }}>
          <EuiPageBody>
            <EuiScreenReaderOnly>
              <h1>
                <FormattedMessage
                  id="xpack.ml.timeSeriesExplorer.pageTitle"
                  defaultMessage="Single Metric Viewer"
                />
              </h1>
            </EuiScreenReaderOnly>
            {children}
          </EuiPageBody>
        </EuiPage>
      </div>
    </>
  );
};
