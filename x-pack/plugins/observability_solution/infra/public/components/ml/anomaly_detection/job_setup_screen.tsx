/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { debounce } from 'lodash';
import React, { useState, useCallback, useMemo, useEffect, useContext } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCode,
  EuiCallOut,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment, { Moment } from 'moment';
import { i18n } from '@kbn/i18n';
import { FeatureFeedbackButton, useUiTracker } from '@kbn/observability-shared-plugin/public';
import { css } from '@emotion/react';
import { useMetricsDataViewContext } from '../../../containers/metrics_source';
import { useMetricHostsModuleContext } from '../../../containers/ml/modules/metrics_hosts/module';
import { useMetricK8sModuleContext } from '../../../containers/ml/modules/metrics_k8s/module';
import { FixedDatePicker } from '../../fixed_datepicker';
import { DEFAULT_K8S_PARTITION_FIELD } from '../../../containers/ml/modules/metrics_k8s/module_descriptor';
import { convertKueryToElasticSearchQuery } from '../../../utils/kuery';
import { INFRA_ML_FLYOUT_FEEDBACK_LINK } from './flyout_home';
import { KibanaEnvironmentContext, useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { MetricsExplorerKueryBar } from '../../../pages/metrics/metrics_explorer/components/kuery_bar';

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
  const { metricsView } = useMetricsDataViewContext();
  const [filter, setFilter] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const trackMetric = useUiTracker({ app: 'infra_metrics' });
  const { kibanaVersion, isCloudEnv, isServerlessEnv } = useContext(KibanaEnvironmentContext);
  const { euiTheme } = useEuiTheme();
  const { telemetry } = useKibanaContextForPlugin().services;

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

  const updateStart = useCallback(
    (date: Moment) => {
      setStartDate(date);
      telemetry.reportAnomalyDetectionDateFieldChange({
        job_type: props.jobType,
        start_date: date.toISOString(),
      });
    },
    [telemetry, props.jobType]
  );

  const createJobs = useCallback(() => {
    const date = moment(startDate).toDate();
    if (hasSummaries) {
      telemetry.reportAnomalyDetectionSetup({
        job_type: props.jobType,
        configured_fields: {
          start_date: date.toISOString(),
          partition_field: partitionField ? partitionField[0] : undefined,
          filter_field: filter ? filter : undefined,
        },
      });
      cleanUpAndSetUpModule(
        indices,
        date.getTime(),
        undefined,
        filterQuery,
        partitionField ? partitionField[0] : undefined
      );
    } else {
      telemetry.reportAnomalyDetectionSetup({
        job_type: props.jobType,
        configured_fields: {
          start_date: date.toISOString(),
          partition_field: partitionField ? partitionField[0] : undefined,
          filter_field: filter,
        },
      });
      setUpModule(
        indices,
        date.getTime(),
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
    telemetry,
    filter,
    props.jobType,
  ]);

  const onFilterChange = useCallback(
    (f: string) => {
      setFilter(f || '');
      setFilterQuery(convertKueryToElasticSearchQuery(f, metricsView?.dataViewReference) || '');
      telemetry.reportAnomalyDetectionFilterFieldChange({
        job_type: props.jobType,
        filter_field: f ? f : undefined,
      });
    },
    [metricsView?.dataViewReference, telemetry, props.jobType]
  );

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const debouncedOnFilterChange = useCallback(debounce(onFilterChange, 500), [onFilterChange]);

  const onPartitionFieldChange = useCallback(
    (value: Array<{ label: string }>) => {
      setPartitionField(value.map((v) => v.label));
      telemetry.reportAnomalyDetectionPartitionFieldChange({
        job_type: props.jobType,
        partition_field: value.length > 0 ? value[0].label : undefined,
      });
    },
    [telemetry, props.jobType]
  );

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
                  defaultMessage="Settings can not be changed once the jobs are created. You can recreate jobs anytime, however, the previously detected anomalies are removed."
                />
              </p>
            </EuiText>

            <EuiSpacer size="l" />
            <EuiForm>
              <EuiDescribedFormGroup
                title={
                  <h3>
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.when.title"
                      defaultMessage="When does your model begin?"
                    />
                  </h3>
                }
                description={
                  <FormattedMessage
                    id="xpack.infra.ml.steps.setupProcess.when.description"
                    defaultMessage="By default, machine learning jobs analyze the last 4 weeks of data and continue to run indefinitely."
                  />
                }
              >
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.when.timePicker.label"
                      defaultMessage="Start date"
                    />
                  }
                >
                  <FixedDatePicker
                    showTimeSelect
                    selected={startDate}
                    onChange={updateStart}
                    maxDate={now}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                title={
                  <h3>
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.partition.title"
                      defaultMessage="How do you want to partition your data?"
                    />
                  </h3>
                }
                description={
                  <FormattedMessage
                    id="xpack.infra.ml.steps.setupProcess.partition.description"
                    defaultMessage="Partitions enable you to build independent models for groups of data that share similar behavior. For example, you can partition by machine type or cloud availability zone."
                  />
                }
              >
                <EuiFormRow
                  label={
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.partition.label"
                      defaultMessage="Partition field"
                    />
                  }
                  display="rowCompressed"
                >
                  <EuiComboBox
                    placeholder={i18n.translate('xpack.infra.metricsExplorer.groupByLabel', {
                      defaultMessage: 'Everything',
                    })}
                    aria-label={i18n.translate('xpack.infra.metricsExplorer.groupByAriaLabel', {
                      defaultMessage: 'Graph per',
                    })}
                    fullWidth
                    singleSelection={true}
                    selectedOptions={
                      partitionField ? partitionField.map((p) => ({ label: p })) : undefined
                    }
                    options={(metricsView?.fields ?? [])
                      .filter((f) => f.aggregatable && f.type === 'string')
                      .map((f) => ({ label: f.name }))}
                    onChange={onPartitionFieldChange}
                    isClearable={true}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                title={
                  <h3>
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.filter.title"
                      defaultMessage="Filter"
                    />
                  </h3>
                }
                description={
                  <FormattedMessage
                    id="xpack.infra.ml.steps.setupProcess.filter.description"
                    defaultMessage="By default, machine learning jobs analyze all of your metric data."
                  />
                }
              >
                <EuiFormRow
                  display="rowCompressed"
                  label={
                    <FormattedMessage
                      id="xpack.infra.ml.steps.setupProcess.filter.label"
                      defaultMessage="Filter (optional)"
                    />
                  }
                >
                  <MetricsExplorerKueryBar
                    onSubmit={onFilterChange}
                    onChange={debouncedOnFilterChange}
                    value={filter}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>
            </EuiForm>
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
