/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSteps,
  EuiButtonGroup,
  EuiIconTip,
  EuiCodeBlock,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useFetcher } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { GetStartedPanel } from '../shared/get_started_panel';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { ObservabilityOnboardingContextValue } from '../../../plugin';

const CLUSTER_OVERVIEW_DASHBOARD_ID = 'kubernetes_otel-70c709ff-59b9-43b7-8ef4-4c34d8890bde';

export const OtelKubernetesPanel: React.FC = () => {
  const { data, error, refetch } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/kubernetes/flow', {
        params: { body: { pkgName: 'kubernetes_otel' } },
      });
    },
    [],
    { showToastOnError: false }
  );
  const [idSelected, setIdSelected] = useState('nodejs');
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const apmLocator = share.url.locators.get('APM_LOCATOR');
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);

  if (error) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const addRepoCommand = `helm repo add open-telemetry 'https://open-telemetry.github.io/opentelemetry-helm-charts' --force-update`;
  const valuesFile =
    'https://raw.githubusercontent.com/elastic/opentelemetry-dev/main/docs/ingest/dev-docs/elastic-otel-collector/operator/onprem_kube_stack_values.yaml';
  const installStackCommand = data
    ? `kubectl create namespace opentelemetry-operator-system
kubectl create secret generic elastic-secret-otel \\
  --namespace opentelemetry-operator-system \\
  --from-literal=elastic_endpoint='${data.elasticsearchUrl}' \\
  --from-literal=elastic_api_key='${data.apiKeyEncoded}'
helm install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace opentelemetry-operator-system \\
  --create-namespace \\
  --values '${valuesFile}'`
    : undefined;

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.addRepositoryStepTitle',
              {
                defaultMessage: 'Add the OpenTelemetry repository to Helm',
              }
            ),
            children: (
              <>
                <EuiCodeBlock paddingSize="m" language="bash">
                  {addRepoCommand}
                </EuiCodeBlock>
                <EuiSpacer />
                <CopyToClipboardButton
                  textToCopy={addRepoCommand}
                  data-test-subj="observabilityOnboardingOtelKubernetesPanelAddRepositoryCopyToClipboard"
                />
              </>
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.installStackStepTitle',
              {
                defaultMessage: 'Install the OpenTelemetry Kube Stack',
              }
            ),
            children: installStackCommand ? (
              <>
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.otelKubernetesPanel.p.injectAutoinstrumentationLibrariesForLabel"
                    defaultMessage="Upgrade the kube-stack Helm chart using the values file. For automatic certificate renewal, we recommend installing {link}."
                    values={{
                      link: (
                        <EuiLink
                          href="https://cert-manager.io/docs/installation/"
                          target="_blank"
                          data-test-subj="observabilityOnboardingOtelKubernetesPanelCertManagerLink"
                        >
                          {i18n.translate(
                            'xpack.observability_onboarding.otelKubernetesPanel.certmanagerLinkLabel',
                            { defaultMessage: 'cert-manager' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />{' '}
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.observability_onboarding.otelKubernetesPanel.helmsAutogeneratedTLSCertificatesTextLabel',
                      {
                        defaultMessage:
                          "Helm's autogenerated TLS certificates have a default expiration period of 365 days. These certificates are not renewed automatically unless the release is manually updated. Enabling cert-manager allows for automatic certificate renewal.",
                      }
                    )}
                    position="top"
                    type="iInCircle"
                  />
                </p>
                <EuiSpacer />
                <EuiCodeBlock paddingSize="m" language="bash">
                  {installStackCommand}
                </EuiCodeBlock>
                <EuiSpacer />
                <EuiFlexGroup alignItems="center" justifyContent="flexStart">
                  <EuiFlexItem grow={false}>
                    <CopyToClipboardButton
                      textToCopy={installStackCommand}
                      data-test-subj="observabilityOnboardingOtelKubernetesPanelInstallStackCopyToClipboard"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      iconType="download"
                      href={valuesFile}
                      download
                      flush="left"
                      data-test-subj="observabilityOnboardingOtelKubernetesPanelDownloadValuesFileButton"
                    >
                      {i18n.translate(
                        'xpack.observability_onboarding.otelKubernetesPanel.downloadValuesFileButtonEmptyLabel',
                        { defaultMessage: 'Download values file' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : (
              <EuiSkeletonText lines={6} />
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.instrumentApplicationStepTitle',
              {
                defaultMessage: 'Instrument your applications',
              }
            ),
            children: (
              <>
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.otelKubernetesPanel.p.injectAutoinstrumentationLibrariesForLabel',
                    {
                      defaultMessage:
                        'The operator automates the injection of auto-instrumentation libraries for pods annotated as follows:',
                    }
                  )}
                </p>
                <EuiSpacer />
                <EuiButtonGroup
                  legend="Select a programming languages"
                  idSelected={idSelected}
                  onChange={(optionId) => setIdSelected(optionId)}
                  options={[
                    {
                      id: 'nodejs',
                      label: 'Node.js',
                    },
                    {
                      id: 'java',
                      label: 'Java',
                    },
                    {
                      id: 'python',
                      label: 'Python',
                    },
                    {
                      id: 'dotnet',
                      label: '.NET',
                    },
                    {
                      id: 'go',
                      label: 'Go',
                    },
                  ]}
                />
                <EuiSpacer />
                <EuiCodeBlock paddingSize="m" language="yaml" lineNumbers={{ highlight: '5-6' }}>
                  {`apiVersion: v1
kind: Pod
metadata:
  name: my-app
  annotations:
    instrumentation.opentelemetry.io/inject-${idSelected}: "true"
spec:
  containers:
  - name: my-app
    image: my-app:latest`}
                </EuiCodeBlock>
                <EuiSpacer />
                <CopyToClipboardButton
                  textToCopy={`annotations:
    instrumentation.opentelemetry.io/inject-${idSelected}: "true"`}
                  data-test-subj={`observabilityOnboardingOtelKubernetesInstrumentApplicationCopyToClipboard-${idSelected}`}
                />
                <EuiSpacer />
                <p>
                  <FormattedMessage
                    id="xpack.observability_onboarding.otelKubernetesPanel.p.forOtherLanguagesThatLabel"
                    defaultMessage="For other languages where auto-instrumentation is not available, {link}"
                    values={{
                      link: (
                        <EuiLink
                          href={`/path`}
                          data-test-subj="observabilityOnboardingOtelKubernetesPanelReferToTheDocumentationLink"
                          target="_blank"
                        >
                          {i18n.translate(
                            'xpack.observability_onboarding.otelKubernetesPanel.referToTheDocumentationLinkLabel',
                            { defaultMessage: 'refer to the documentation' }
                          )}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </>
            ),
          },
          {
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.monitorStepTitle',
              {
                defaultMessage: 'Visualize your data',
              }
            ),
            children: (
              <>
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.otelKubernetesPanel.p.onceYourKubernetesInfrastructureLabel',
                    {
                      defaultMessage:
                        'Once your Kubernetes infrastructure and application data is collected, you can start analyzing it.',
                    }
                  )}
                </p>
                <EuiSpacer />
                <GetStartedPanel
                  newTab={false}
                  isLoading={false}
                  actionLinks={[
                    {
                      id: CLUSTER_OVERVIEW_DASHBOARD_ID,
                      title: i18n.translate(
                        'xpack.observability_onboarding.kubernetesPanel.monitoringCluster',
                        {
                          defaultMessage: 'Check your Kubernetes cluster health:',
                        }
                      ),
                      label: i18n.translate(
                        'xpack.observability_onboarding.kubernetesPanel.exploreDashboard',
                        {
                          defaultMessage: 'Explore Kubernetes Cluster Dashboard',
                        }
                      ),
                      href:
                        dashboardLocator?.getRedirectUrl({
                          dashboardId: CLUSTER_OVERVIEW_DASHBOARD_ID,
                        }) ?? '',
                    },
                    {
                      id: 'services',
                      title: i18n.translate(
                        'xpack.observability_onboarding.otelKubernetesPanel.servicesTitle',
                        {
                          defaultMessage: 'Check your application services:',
                        }
                      ),
                      label: i18n.translate(
                        'xpack.observability_onboarding.otelKubernetesPanel.servicesLabel',
                        {
                          defaultMessage: 'Explore Service Inventory',
                        }
                      ),
                      href: apmLocator?.getRedirectUrl({ serviceName: undefined }) ?? '',
                    },
                  ]}
                />
              </>
            ),
          },
        ]}
      />
      <FeedbackButtons flow="otel_kubernetes" />
    </EuiPanel>
  );
};
