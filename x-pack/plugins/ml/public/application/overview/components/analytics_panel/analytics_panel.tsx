/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
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
import { useMlLink } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { useRefresh } from '../../../routing/use_refresh';
import type { GetDataFrameAnalyticsStatsResponseError } from '../../../services/ml_api_service/data_frame_analytics';
import { AnalyticsEmptyPrompt } from '../../../data_frame_analytics/pages/analytics_management/components/empty_prompt';

interface Props {
  setLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}
export const AnalyticsPanel: FC<Props> = ({ setLazyJobCount }) => {
  const refresh = useRefresh();

  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [errorMessage, setErrorMessage] = useState<GetDataFrameAnalyticsStatsResponseError>();
  const [isInitialized, setIsInitialized] = useState(false);

  const manageJobsLink = useMlLink({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
  });

  const getAnalytics = getAnalyticsFactory(
    setAnalytics,
    setAnalyticsStats,
    setErrorMessage,
    setIsInitialized,
    setLazyJobCount,
    false,
    false
  );

  useEffect(() => {
    getAnalytics(true);
  }, [refresh]);

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

  const noDFAJobs = errorMessage === undefined && isInitialized === true && analytics.length === 0;

  return (
    <>
      {noDFAJobs ? (
        <AnalyticsEmptyPrompt />
      ) : (
        <EuiPanel className={panelClass} hasShadow={false} hasBorder>
          {typeof errorMessage !== 'undefined' ? errorDisplay : null}
          {isInitialized === false && (
            <EuiLoadingSpinner className="mlOverviewPanel__spinner" size="xl" />
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
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize={'s'} alignItems="center">
                    {analyticsStats !== undefined ? (
                      <EuiFlexItem grow={false}>
                        <StatsBar
                          stats={analyticsStats}
                          dataTestSub={'mlOverviewAnalyticsStatsBar'}
                        />
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButton size="m" fill href={manageJobsLink}>
                        {i18n.translate('xpack.ml.overview.analyticsList.manageJobsButtonText', {
                          defaultMessage: 'Manage jobs',
                        })}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer />
              <AnalyticsTable items={analytics} />
            </>
          )}
        </EuiPanel>
      )}
    </>
  );
};
