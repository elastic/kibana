/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiFlyoutBody, EuiTabs, EuiTab, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiText, EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { useInfraMLCapabilitiesContext } from '../../../../../../containers/ml/infra_ml_capabilities';
import { SubscriptionSplashContent } from './subscription_splash_content';
import {
  MissingResultsPrivilegesPrompt,
  MissingSetupPrivilegesPrompt,
} from '../../../../../../components/logging/log_analysis_setup';
import { useMetricHostsModuleContext } from '../../../../../../containers/ml/modules/metrics_hosts/module';
import { useMetricK8sModuleContext } from '../../../../../../containers/ml/modules/metrics_k8s/module';
import { LoadingPage } from '../../../../../../components/loading_page';

interface Props {
  hasSetupCapabilities: boolean;
  goToSetup(type: 'hosts' | 'kubernetes'): void;
}

export const FlyoutHome = (props: Props) => {
  const [tab, setTab] = useState<'jobs' | 'anomalies'>('jobs');
  const { goToSetup } = props;
  const {
    fetchJobStatus: fetchHostJobStatus,
    setupStatus: hostSetupStatus,
    jobSummaries: hostJobSummaries,
  } = useMetricHostsModuleContext();
  const {
    fetchJobStatus: fetchK8sJobStatus,
    setupStatus: k8sSetupStatus,
    jobSummaries: k8sJobSummaries,
  } = useMetricK8sModuleContext();
  const {
    hasInfraMLCapabilites,
    hasInfraMLReadCapabilities,
    hasInfraMLSetupCapabilities,
  } = useInfraMLCapabilitiesContext();

  const createHosts = useCallback(() => {
    goToSetup('hosts');
  }, [goToSetup]);

  const createK8s = useCallback(() => {
    goToSetup('kubernetes');
  }, [goToSetup]);

  const goToJobs = useCallback(() => {
    setTab('jobs');
  }, []);

  const goToAnomalies = useCallback(() => {
    setTab('anomalies');
  }, []);

  useEffect(() => {
    if (hasInfraMLReadCapabilities) {
      fetchHostJobStatus();
      fetchK8sJobStatus();
    }
  }, [fetchK8sJobStatus, fetchHostJobStatus, hasInfraMLReadCapabilities]);

  if (!hasInfraMLCapabilites) {
    return <SubscriptionSplashContent />;
  } else if (!hasInfraMLReadCapabilities) {
    return <MissingResultsPrivilegesPrompt />;
  } else if (hostSetupStatus.type === 'initializing' || k8sSetupStatus.type === 'initializing') {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.ml.anomalyFlyout.jobStatusLoadingMessage', {
          defaultMessage: 'Checking status of metris jobs...',
        })}
      />
    );
  } else if (!hasInfraMLSetupCapabilities) {
    return <MissingSetupPrivilegesPrompt />;
  } else {
    return (
      <>
        <EuiFlyoutHeader>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                defaultMessage="Machine Learning anomaly detection"
                id="xpack.infra.ml.anomalyFlyout.flyoutHeader"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          <EuiTabs>
            <EuiTab isSelected={tab === 'jobs'} onClick={goToJobs}>
              <FormattedMessage
                defaultMessage="Jobs"
                id="xpack.infra.ml.anomalyFlyout.jobsTabLabel"
              />
            </EuiTab>
            <EuiTab isSelected={tab === 'anomalies'} onClick={goToAnomalies}>
              <FormattedMessage
                defaultMessage="Anomalies"
                id="xpack.infra.ml.anomalyFlyout.anomaliesTabLabel"
              />
            </EuiTab>
          </EuiTabs>
          <EuiSpacer size="l" />
          {hostJobSummaries.length > 0 && (
            <>
              <JobsEnabledCallout
                hasHostJobs={hostJobSummaries.length > 0}
                hasK8sJobs={k8sJobSummaries.length > 0}
              />
              <EuiSpacer size="l" />
            </>
          )}
          <CreateJobTab
            hasHostJobs={hostJobSummaries.length > 0}
            hasK8sJobs={k8sJobSummaries.length > 0}
            hasSetupCapabilities={props.hasSetupCapabilities}
            createHosts={createHosts}
            createK8s={createK8s}
          />
        </EuiFlyoutBody>
      </>
    );
  }
};

interface CalloutProps {
  hasHostJobs: boolean;
  hasK8sJobs: boolean;
}
const JobsEnabledCallout = (props: CalloutProps) => {
  let target = '';
  if (props.hasHostJobs && props.hasK8sJobs) {
    target = `${i18n.translate('xpack.infra.ml.anomalyFlyout.create.hostTitle', {
      defaultMessage: 'Hosts',
    })} and ${i18n.translate('xpack.infra.ml.anomalyFlyout.create.k8sSuccessTitle', {
      defaultMessage: 'Kubernetes',
    })}`;
  } else if (props.hasHostJobs) {
    target = i18n.translate('xpack.infra.ml.anomalyFlyout.create.hostSuccessTitle', {
      defaultMessage: 'Hosts',
    });
  } else if (props.hasK8sJobs) {
    target = i18n.translate('xpack.infra.ml.anomalyFlyout.create.k8sSuccessTitle', {
      defaultMessage: 'Kubernetes',
    });
  }

  return (
    <>
      <EuiCallOut
        size="m"
        color="success"
        title={
          <FormattedMessage
            defaultMessage="Anomaly detection enabled for {target}"
            id="xpack.infra.ml.anomalyFlyout.enabledCallout"
            values={{ target }}
          />
        }
        iconType="check"
      />
      <EuiSpacer size="l" />
      <EuiButton>
        <FormattedMessage
          defaultMessage="Manage Jobs"
          id="xpack.infra.ml.anomalyFlyout.manageJobs"
        />
      </EuiButton>
    </>
  );
};

interface CreateJobTab {
  hasSetupCapabilities: boolean;
  hasHostJobs: boolean;
  hasK8sJobs: boolean;
  createHosts(): void;
  createK8s(): void;
}

const CreateJobTab = (props: CreateJobTab) => {
  return (
    <>
      <div>
        <EuiText>
          <h3>
            <FormattedMessage
              defaultMessage="Create ML Jobs"
              id="xpack.infra.ml.anomalyFlyout.create.jobsTitle"
            />
          </h3>
        </EuiText>
        <EuiText>
          <p>
            <FormattedMessage
              defaultMessage="Machine Learning jobs are available for the following resource types. Enable these jobs to begin detecting anomalies in your infrastructure metrics"
              id="xpack.infra.ml.anomalyFlyout.create.description"
            />
          </p>
        </EuiText>
      </div>

      <EuiSpacer size="l" />
      <EuiFlexGroup gutterSize={'m'}>
        <EuiFlexItem>
          <EuiCard
            // isDisabled={props.hasSetupCapabilities}
            icon={<EuiIcon type={'storage'} />}
            // title="Hosts"
            title={
              <FormattedMessage
                defaultMessage="Hosts"
                id="xpack.infra.ml.anomalyFlyout.create.hostTitle"
              />
            }
            description={
              <FormattedMessage
                defaultMessage="Detect anomalies for CPU usage, memory usage, network traffic, and load."
                id="xpack.infra.ml.anomalyFlyout.create.hostDescription"
              />
            }
            footer={
              <>
                {props.hasHostJobs && (
                  <EuiButtonEmpty onClick={props.createHosts}>
                    <FormattedMessage
                      defaultMessage="Recreate Jobs"
                      id="xpack.infra.ml.anomalyFlyout.create.recreateButton"
                    />
                  </EuiButtonEmpty>
                )}
                {!props.hasHostJobs && (
                  <EuiButton onClick={props.createHosts}>
                    <FormattedMessage
                      defaultMessage="Create Jobs"
                      id="xpack.infra.ml.anomalyFlyout.create.createButton"
                    />
                  </EuiButton>
                )}
              </>
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            // isDisabled={props.hasSetupCapabilities}
            icon={<EuiIcon type={'logoKubernetes'} />}
            title={
              <FormattedMessage
                defaultMessage="Kubernetes Pods"
                id="xpack.infra.ml.anomalyFlyout.create.k8sTitle"
              />
            }
            description={
              <FormattedMessage
                defaultMessage="Detect anomalies for CPU usage, memory usage, network traffic, and load."
                id="xpack.infra.ml.anomalyFlyout.create.k8sDescription"
              />
            }
            footer={
              <>
                {props.hasK8sJobs && (
                  <EuiButtonEmpty onClick={props.createK8s}>
                    <FormattedMessage
                      defaultMessage="Recreate Jobs"
                      id="xpack.infra.ml.anomalyFlyout.create.recreateButton"
                    />
                  </EuiButtonEmpty>
                )}
                {!props.hasK8sJobs && (
                  <EuiButton onClick={props.createK8s}>
                    <FormattedMessage
                      defaultMessage="Create Jobs"
                      id="xpack.infra.ml.anomalyFlyout.create.createButton"
                    />
                  </EuiButton>
                )}
              </>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
