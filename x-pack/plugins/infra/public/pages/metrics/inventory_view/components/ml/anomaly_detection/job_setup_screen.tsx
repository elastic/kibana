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

  const derivedIndexPattern = useMemo(() => createDerivedIndexPattern('metrics'), [
    createDerivedIndexPattern,
  ]);

  const updateStart = useCallback((date: Moment) => {
    setStartDate(date);
  }, []);

  const createJobs = useCallback(() => {
    cleanUpAndSetUpModule(
      indicies,
      moment(startDate).toDate().getTime(),
      undefined,
      { type: 'includeAll' },
      partitionField ? partitionField[0] : undefined
    );
  }, [cleanUpAndSetUpModule, indicies, partitionField, startDate]);

  const onPartitionFieldChange = useCallback((value: Array<{ label: string }>) => {
    setPartitionField(value.map((v) => v.label));
  }, []);

  useEffect(() => {
    if (props.jobType === 'kubernetes') {
      setPartitionField(['kubernetes.service.name']);
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
              defaultMessage="Enable Machine Learning for {nodeType}"
              id="xpack.ml.aomalyFlyout.jobSetup.flyoutHeader"
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
                id="xpack.infra.analysisSetup.steps.setupProcess.loadingText"
                defaultMessage="Creating ML job..."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : setupStatus.type === 'failed' ? (
          <>
            <FormattedMessage
              id="xpack.infra.analysisSetup.steps.setupProcess.failureText"
              defaultMessage="Something went wrong creating the necessary ML jobs. Please ensure all selected log indices exist."
            />
            <EuiSpacer />
            <EuiButton fill onClick={createJobs}>
              <FormattedMessage
                id="xpack.infra.analysisSetup.steps.setupProcess.tryAgainButton"
                defaultMessage="Try again"
              />
            </EuiButton>
          </>
        ) : (
          <>
            <EuiText>
              <p>
                Answer the following questions to configure Machine Learning jobs for Metrics. These
                settings can not be changed once the jobs are created. You can recreate these jobs
                later; however, any previously detected anomalies will be removed as a result.
              </p>
            </EuiText>

            <EuiSpacer size="l" />
            <EuiForm>
              <EuiDescribedFormGroup
                title={<h3>When does your model begin?</h3>}
                description={
                  'By default, Machine Learning jobs will analyze the past 4 weeks of data and continue to run indefinitely. You can specify a different start date, end date, or both. We recommend that you run jobs indefinitely.'
                }
              >
                <EuiFormRow label="Start date">
                  <FixedDatePicker
                    showTimeSelect
                    selected={startDate}
                    onChange={updateStart}
                    maxDate={now}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>

              <EuiDescribedFormGroup
                title={<h3>How do you want to partition your data?</h3>}
                description={
                  'Partitions allow you to build independent models for different groups of data that share similar behavior. For example, you may want to build seperate models for machine type or cloud availability zone so that anomalies are not weighted equally across groups.'
                }
              >
                <EuiFormRow label={'Partition filed'} compressed>
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
              <FormattedMessage id="console.welcomePage.closeButtonLabel" defaultMessage="Cancel" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill={true} fullWidth={false} onClick={createJobs}>
              <FormattedMessage
                id="console.welcomePage.closeButtonLabel"
                defaultMessage="Enable Jobs"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
