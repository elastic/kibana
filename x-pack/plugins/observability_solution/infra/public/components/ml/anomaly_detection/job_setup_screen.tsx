/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useMemo, useEffect, useContext } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  EuiAccordion,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import { FeatureFeedbackButton, useUiTracker } from '@kbn/observability-shared-plugin/public';
import { css } from '@emotion/react';
import { useMetricHostsModuleContext } from '../../../containers/ml/modules/metrics_hosts/module';
import { useMetricK8sModuleContext } from '../../../containers/ml/modules/metrics_k8s/module';
import { DEFAULT_K8S_PARTITION_FIELD } from '../../../containers/ml/modules/metrics_k8s/module_descriptor';
import { INFRA_ML_FLYOUT_FEEDBACK_LINK } from './flyout_home';
import { KibanaEnvironmentContext } from '../../../hooks/use_kibana';
import { JobAdvancedSettings } from './job_advanced_settings';

interface Props {
  jobType: 'hosts' | 'kubernetes';
  closeFlyout(): void;
  goHome(): void;
}

export const JobSetupScreen = (props: Props) => {
  const [now] = useState(() => moment());
  const { goHome } = props;
  const [startDate, setStartDate] = useState<Moment>(now.clone().subtract(4, 'weeks'));
  const [partitionField, setPartitionField] = useState<string[] | null>(null);
  const host = useMetricHostsModuleContext();
  const kubernetes = useMetricK8sModuleContext();
  const [filterQuery, setFilterQuery] = useState<string>('');
  const trackMetric = useUiTracker({ app: 'infra_metrics' });
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useContext(KibanaEnvironmentContext);
  const { euiTheme } = useEuiTheme();

  const indices = host.sourceConfiguration.indices;

  const setupStatus = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return kubernetes.setupStatus;
    } else {
      return host.setupStatus;
    }
  }, [props.jobType, kubernetes.setupStatus, host.setupStatus]);

  const cleanUpAndSetUpModule = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return kubernetes.cleanUpAndSetUpModule;
    } else {
      return host.cleanUpAndSetUpModule;
    }
  }, [props.jobType, kubernetes.cleanUpAndSetUpModule, host.cleanUpAndSetUpModule]);

  const setUpModule = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return kubernetes.setUpModule;
    } else {
      return host.setUpModule;
    }
  }, [props.jobType, kubernetes.setUpModule, host.setUpModule]);

  const hasSummaries = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return kubernetes.jobSummaries.length > 0;
    } else {
      return host.jobSummaries.length > 0;
    }
  }, [props.jobType, kubernetes.jobSummaries, host.jobSummaries]);

  const createJobs = useCallback(() => {
    if (hasSummaries) {
      cleanUpAndSetUpModule(
        indices,
        moment(startDate).toDate().getTime(),
        undefined,
        filterQuery,
        partitionField ? partitionField[0] : undefined
      );
    } else {
      setUpModule(
        indices,
        moment(startDate).toDate().getTime(),
        undefined,
        filterQuery,
        partitionField ? partitionField[0] : undefined
      );
    }
  }, [
    cleanUpAndSetUpModule,
    filterQuery,
    setUpModule,
    hasSummaries,
    indices,
    partitionField,
    startDate,
  ]);

  useEffect(() => {
    if (props.jobType === 'kubernetes') {
      setPartitionField([DEFAULT_K8S_PARTITION_FIELD]);
    }
  }, [props.jobType]);

  useEffect(() => {
    if (setupStatus.type === 'succeeded') {
      if (props.jobType === 'kubernetes') {
        trackMetric({ metric: 'metrics_ml_anomaly_detection_k8s_enabled' });
        if (
          partitionField &&
          (partitionField.length !== 1 || partitionField[0] !== DEFAULT_K8S_PARTITION_FIELD)
        ) {
          trackMetric({ metric: 'metrics_ml_anomaly_detection_k8s_partition_changed' });
        }
      } else {
        trackMetric({ metric: 'metrics_ml_anomaly_detection_hosts_enabled' });
        if (partitionField) {
          trackMetric({ metric: 'metrics_ml_anomaly_detection_hosts_partition_changed' });
        }
        trackMetric({ metric: 'metrics_ml_anomaly_detection_hosts_enabled' });
      }

      goHome();
    }
  }, [setupStatus, props.jobType, partitionField, trackMetric, goHome]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h2>
                <FormattedMessage
                  defaultMessage="Enable machine learning for {nodeType}"
                  id="xpack.infra.ml.aomalyFlyout.jobSetup.flyoutHeader"
                  values={{ nodeType: props.jobType }}
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem
            grow={false}
            css={css`
              margin-right: ${euiTheme.size.l};
            `}
          >
            <FeatureFeedbackButton
              data-test-subj={`infraML${props.jobType}FlyoutFeedbackLink`}
              formUrl={INFRA_ML_FLYOUT_FEEDBACK_LINK}
              kibanaVersion={kibanaVersion}
              isCloudEnv={isCloudEnv}
              isServerlessEnv={isServerlessEnv}
              nodeType={props.jobType === 'kubernetes' ? 'pod' : 'host'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {setupStatus.type === 'pending' ? (
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.loadingText"
                defaultMessage="Creating ML job..."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : setupStatus.type === 'failed' ? (
          <>
            <FormattedMessage
              id="xpack.infra.ml.steps.setupProcess.failureText"
              defaultMessage="Something went wrong creating the necessary ML jobs."
            />
            <EuiSpacer />
            {setupStatus.reasons.map((errorMessage, i) => (
              <React.Fragment key={i}>
                <EuiCallOut color="danger" iconType="warning" title={errorCalloutTitle}>
                  <EuiCode transparentBackground>{errorMessage}</EuiCode>
                </EuiCallOut>
                <EuiSpacer />
              </React.Fragment>
            ))}
            <EuiButton data-test-subj="infraJobSetupScreenTryAgainButton" fill onClick={createJobs}>
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.tryAgainButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          </>
        ) : (
          <>
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.infra.ml.steps.setupProcess.description"
                  defaultMessage="Enable anomaly detection using our recommended settings or fine-tune your jobs using the advanced settings. If you need to make changes after creating your jobs, you can recreate them at any time (previous anomalies will be removed)."
                />
              </p>
            </EuiText>

            <EuiSpacer size="l" />
            <EuiAccordion
              id="advancedSettingsAccordionId"
              buttonContent="Advanced Settings"
              paddingSize="m"
            >
              <JobAdvancedSettings
                jobType={props.jobType}
                setFilterQuery={setFilterQuery}
                startDate={startDate}
                now={now}
                setStartDate={setStartDate}
                partitionField={partitionField}
                setPartitionField={setPartitionField}
              />
            </EuiAccordion>
          </>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="infraJobSetupScreenCancelButton"
              onClick={props.closeFlyout}
            >
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="infraJobSetupScreenEnableJobsButton"
              fill={true}
              fullWidth={false}
              onClick={createJobs}
            >
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.enableButton"
                defaultMessage="Enable jobs"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

const errorCalloutTitle = i18n.translate('xpack.infra.ml.steps.setupProcess.errorCalloutTitle', {
  defaultMessage: 'An error occurred',
});
