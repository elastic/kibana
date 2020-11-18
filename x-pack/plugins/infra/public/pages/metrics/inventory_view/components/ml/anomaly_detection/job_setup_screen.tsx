/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { EuiForm, EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlyoutFooter } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import moment, { Moment } from 'moment';
import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useSourceViaHttp } from '../../../../../../containers/source/use_source_via_http';
import { useMetricK8sModuleContext } from '../../../../../../containers/ml/modules/metrics_k8s/module';
import { useMetricHostsModuleContext } from '../../../../../../containers/ml/modules/metrics_hosts/module';
import { FixedDatePicker } from '../../../../../../components/fixed_datepicker';
import { DEFAULT_K8S_PARTITION_FIELD } from '../../../../../../containers/ml/modules/metrics_k8s/module_descriptor';

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
  const h = useMetricHostsModuleContext();
  const k = useMetricK8sModuleContext();
  const { createDerivedIndexPattern } = useSourceViaHttp({
    sourceId: 'default',
    type: 'metrics',
  });

  const indicies = h.sourceConfiguration.indices;

  const setupStatus = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return k.setupStatus;
    } else {
      return h.setupStatus;
    }
  }, [props.jobType, k.setupStatus, h.setupStatus]);

  const cleanUpAndSetUpModule = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return k.cleanUpAndSetUpModule;
    } else {
      return h.cleanUpAndSetUpModule;
    }
  }, [props.jobType, k.cleanUpAndSetUpModule, h.cleanUpAndSetUpModule]);

  const setUpModule = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return k.setUpModule;
    } else {
      return h.setUpModule;
    }
  }, [props.jobType, k.setUpModule, h.setUpModule]);

  const hasSummaries = useMemo(() => {
    if (props.jobType === 'kubernetes') {
      return k.jobSummaries.length > 0;
    } else {
      return h.jobSummaries.length > 0;
    }
  }, [props.jobType, k.jobSummaries, h.jobSummaries]);

  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);

  const updateStart = useCallback((date: Moment) => {
    setStartDate(date);
  }, []);

  const createJobs = useCallback(() => {
    if (hasSummaries) {
      cleanUpAndSetUpModule(
        indicies,
        moment(startDate).toDate().getTime(),
        undefined,
        { type: 'includeAll' },
        partitionField ? partitionField[0] : undefined
      );
    } else {
      setUpModule(
        indicies,
        moment(startDate).toDate().getTime(),
        undefined,
        { type: 'includeAll' },
        partitionField ? partitionField[0] : undefined
      );
    }
  }, [cleanUpAndSetUpModule, setUpModule, hasSummaries, indicies, partitionField, startDate]);

  const onPartitionFieldChange = useCallback((value: Array<{ label: string }>) => {
    setPartitionField(value.map((v) => v.label));
  }, []);

  useEffect(() => {
    if (props.jobType === 'kubernetes') {
      setPartitionField([DEFAULT_K8S_PARTITION_FIELD]);
    }
  }, [props.jobType]);

  useEffect(() => {
    if (setupStatus.type === 'succeeded') {
      goHome();
    }
  }, [setupStatus, goHome]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              defaultMessage="Enable machine learning for {nodeType}"
              id="xpack.infra.ml.aomalyFlyout.jobSetup.flyoutHeader"
              values={{ nodeType: props.jobType }}
            />
          </h2>
        </EuiTitle>
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
            <EuiButton fill onClick={createJobs}>
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
                    options={derivedIndexPattern.fields
                      .filter((f) => f.aggregatable && f.type === 'string')
                      .map((f) => ({ label: f.name }))}
                    onChange={onPartitionFieldChange}
                    isClearable={true}
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
            <EuiButtonEmpty onClick={props.closeFlyout}>
              <FormattedMessage
                id="xpack.infra.ml.steps.setupProcess.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill={true} fullWidth={false} onClick={createJobs}>
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
