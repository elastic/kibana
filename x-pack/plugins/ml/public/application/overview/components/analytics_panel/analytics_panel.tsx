/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
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
import { useMlKibana, useMlLink } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { SourceSelection } from '../../../data_frame_analytics/pages/analytics_management/components/source_selection';
import adImage from '../../../components/anomaly_detection_empty_state/ml_anomaly_detection.png';
import { useRefresh } from '../../../routing/use_refresh';

interface Props {
  jobCreationDisabled: boolean;
  setLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}
export const AnalyticsPanel: FC<Props> = ({ jobCreationDisabled, setLazyJobCount }) => {
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  const refresh = useRefresh();

  const [analytics, setAnalytics] = useState<DataFrameAnalyticsListRow[]>([]);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticStatsBarStats | undefined>(
    undefined
  );
  const [errorMessage, setErrorMessage] = useState<any>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSourceIndexModalVisible, setIsSourceIndexModalVisible] = useState(false);

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

  const transformsLink = `${basePath.get()}/app/management/data/transform`;

  const noDFAJobs = errorMessage === undefined && isInitialized === true && analytics.length === 0;

  return (
    <>
      {noDFAJobs ? (
        <EuiEmptyPrompt
          layout="horizontal"
          hasBorder={true}
          hasShadow={false}
          icon={<EuiImage size="fullWidth" src={adImage} alt="anomaly_detection" />}
          title={
            <h2>
              <FormattedMessage
                id="xpack.ml.overview.analyticsList.createFirstJobMessage"
                defaultMessage="Create your first data frame analytics job"
              />
            </h2>
          }
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.ml.overview.analyticsList.emptyPromptText"
                  defaultMessage="Data frame analytics enables you to perform outlier detection, regression, or classification analysis and put the annotated data in a new index. The classification and regression trained models can also be used for inference in pipelines and aggregations."
                />
              </p>
              <EuiCallOut
                size="s"
                title={
                  <FormattedMessage
                    id="xpack.ml.overview.analyticsList.emptyPromptHelperText"
                    defaultMessage="Data frame analytics requires specifically structured source data. Use {transforms} to create data frames before you create the jobs."
                    values={{
                      transforms: (
                        <EuiLink href={transformsLink} target="blank" color={'accent'}>
                          <FormattedMessage
                            id="xpack.ml.overview.gettingStartedSectionTransforms"
                            defaultMessage="Elasticsearch's transforms"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                }
                iconType="iInCircle"
              />
            </>
          }
          actions={
            <EuiButton
              onClick={() => {
                setIsSourceIndexModalVisible(true);
              }}
              color="primary"
              fill
              isDisabled={jobCreationDisabled}
              data-test-subj="mlOverviewCreateDFAJobButton"
            >
              <FormattedMessage
                id="xpack.ml.overview.analyticsList.createJobButtonText"
                defaultMessage="Create job"
              />
            </EuiButton>
          }
        />
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

      {isSourceIndexModalVisible ? (
        <SourceSelection onClose={() => setIsSourceIndexModalVisible(false)} />
      ) : null}
    </>
  );
};
