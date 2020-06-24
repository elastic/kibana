/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AnalyticsTable } from './table';
import { getAnalyticsFactory } from '../../../data_frame_analytics/pages/analytics_management/services/analytics_service';
import { DataFrameAnalyticsListRow } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import { AnalyticStatsBarStats, StatsBar } from '../../../components/stats_bar';

interface Props {
  jobCreationDisabled: boolean;
}
export const AnalyticsPanel: FC<Props> = ({ jobCreationDisabled }) => {
  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    false
  );

  useEffect(() => {
    getAnalytics(true);
  }, []);

  const onRefresh = () => {
    getAnalytics(true);
  };

  const errorDisplay = (
    <EuiCallOut
      title={i18n.translate('xpack.ml.overview.analyticsList.errorPromptTitle', {
        defaultMessage: 'An error occurred getting the data frame analytics list.',
      })}
      color="danger"
      iconType="alert"
    >
      <pre>
        {errorMessage && errorMessage.message !== undefined
          ? errorMessage.message
          : JSON.stringify(errorMessage)}
      </pre>
    </EuiCallOut>
  );

  const panelClass = isInitialized === false ? 'mlOverviewPanel__isLoading' : 'mlOverviewPanel';

  return (
    <EuiPanel className={panelClass}>
      {typeof errorMessage !== 'undefined' && errorDisplay}
      {isInitialized === false && (
        <EuiLoadingSpinner className="mlOverviewPanel__spinner" size="xl" />
      )}
          
      {errorMessage === undefined && isInitialized === true && analytics.length === 0 && (
        <EuiEmptyPrompt
          iconType="createAdvancedJob"
          title={
            <h2>
              {i18n.translate('xpack.ml.overview.analyticsList.createFirstJobMessage', {
                defaultMessage: 'Create your first data frame analytics job',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.ml.overview.analyticsList.emptyPromptText', {
                defaultMessage: `Data frame analytics enables you to perform outlier detection, regression, or classification analysis on your data and annotates it with the results. The job puts the annotated data and a copy of the source data in a new index.`,
              })}
            </p>
          }
          actions={
            <EuiButton
              href="#/data_frame_analytics?"
              color="primary"
              fill
              iconType="plusInCircle"
              isDisabled={jobCreationDisabled}
            >
              {i18n.translate('xpack.ml.overview.analyticsList.createJobButtonText', {
                defaultMessage: 'Create job',
              })}
            </EuiButton>
          }
        />
      )}
      {isInitialized === true && analytics.length > 0 && (
        <>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiText size="m">
                <h3>
                  {i18n.translate('xpack.ml.overview.analyticsList.PanelTitle', {
                    defaultMessage: 'Analytics',
                  })}
                </h3>
              </EuiText>
            </EuiFlexItem>
            {analyticsStats !== undefined && (
              <EuiFlexItem grow={false} className="mlOverviewPanel__statsBar">
                <StatsBar stats={analyticsStats} dataTestSub={'mlOverviewAnalyticsStatsBar'} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer />
          <AnalyticsTable items={analytics} />
          <EuiSpacer size="m" />
          <div className="mlOverviewPanel__buttons">
            <EuiButtonEmpty size="s" onClick={onRefresh} className="mlOverviewPanel__refreshButton">
              {i18n.translate('xpack.ml.overview.analyticsList.refreshJobsButtonText', {
                defaultMessage: 'Refresh',
              })}
            </EuiButtonEmpty>
            <EuiButton size="s" fill href="#/data_frame_analytics?">
              {i18n.translate('xpack.ml.overview.analyticsList.manageJobsButtonText', {
                defaultMessage: 'Manage jobs',
              })}
            </EuiButton>
          </div>
        </>
      )}
    </EuiPanel>
  );
};
