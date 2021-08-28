/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPage,
  EuiPageBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React from 'react';
import { AnomalyResultsViewSelector } from '../components/anomaly_results_view_selector/anomaly_results_view_selector';
import { HelpMenu } from '../components/help_menu/help_menu';
import { JobSelector } from '../components/job_selector/job_selector';
import { DatePickerWrapper } from '../components/navigation_menu/date_picker_wrapper/date_picker_wrapper';
import { NavigationMenu } from '../components/navigation_menu/navigation_menu';
import { useMlKibana } from '../contexts/kibana/kibana_context';

interface TimeSeriesExplorerPageProps {
  dateFormatTz: string;
  resizeRef?: any;
}

export const TimeSeriesExplorerPage: FC<TimeSeriesExplorerPageProps> = ({
  children,
  dateFormatTz,
  resizeRef,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.anomalyDetection;
  return (
    <>
      <NavigationMenu tabId="anomaly_detection" />
      <div
        className="ml-time-series-explorer"
        ref={resizeRef}
        data-test-subj="mlPageSingleMetricViewer"
      >
        <EuiPage style={{ background: 'none' }}>
          <EuiPageBody>
            <EuiPageHeader>
              <EuiPageHeaderSection>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <AnomalyResultsViewSelector viewId="timeseriesexplorer" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiTitle className="eui-textNoWrap">
                      <h1>
                        <FormattedMessage
                          id="xpack.ml.timeSeriesExplorer.pageTitle"
                          defaultMessage="Single Metric Viewer"
                        />
                      </h1>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageHeaderSection>
              <EuiPageHeaderSection>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <DatePickerWrapper />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPageHeaderSection>
            </EuiPageHeader>
            <EuiHorizontalRule margin="none" />
            <JobSelector dateFormatTz={dateFormatTz} singleSelection={true} timeseriesOnly={true} />
            <EuiHorizontalRule margin="none" />
            <EuiSpacer size="s" />
            {children}
          </EuiPageBody>
        </EuiPage>
        <HelpMenu docLink={helpLink} />
      </div>
    </>
  );
};
