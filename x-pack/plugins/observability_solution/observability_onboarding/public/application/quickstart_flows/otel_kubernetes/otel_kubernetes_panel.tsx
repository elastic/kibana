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
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useFetcher } from '../../../hooks/use_fetcher';
import { EmptyPrompt } from '../shared/empty_prompt';
import { GetStartedPanel } from '../shared/get_started_panel';
import { FeedbackButtons } from '../shared/feedback_buttons';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { ObservabilityOnboardingContextValue } from '../../../plugin';

const CLUSTER_OVERVIEW_DASHBOARD_ID = 'kubernetes-f4dc26db-1b53-4ea2-a78b-1bfab8ea267c';

export const OtelKubernetesPanel: React.FC = () => {
  const { data, error, refetch } = useFetcher(
    (callApi) => {
      return callApi('POST /internal/observability_onboarding/kubernetes/flow');
    },
    [],
    { showToastOnError: false }
  );
  const [idSelected, setIdSelected] = useState('nodejs');
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const apmLocator = share.url.locators.get('APM_LOCATOR');

  if (error) {
    return <EmptyPrompt error={error} onRetryClick={refetch} />;
  }

  const command = data
    ? `# Install the cert-manager dependency
helm repo add jetstack 'https://charts.jetstack.io' --force-update
helm install cert-manager jetstack/cert-manager \\
  --namespace cert-manager \\
  --create-namespace \\
  --version v1.15.3 \\
  --set crds.enabled=true

# Create a secret with your Elasticsearch credentials
kubectl create namespace opentelemetry-operator-system
kubectl create secret generic elastic-secret-otel \\
  --namespace opentelemetry-operator-system \\
  --from-literal=elastic_endpoint='${data.elasticsearchUrl}' \\
  --from-literal=elastic_api_key='${data.apiKeyEncoded}'

# Install the OpenTelemetry Kube Stack
helm repo add open-telemetry 'https://open-telemetry.github.io/opentelemetry-helm-charts' --force-update
helm install opentelemetry-kube-stack open-telemetry/opentelemetry-kube-stack \\
  --namespace opentelemetry-operator-system \\
  --create-namespace \\
  --values 'https://raw.githubusercontent.com/elastic/opentelemetry-dev/main/docs/ingest/dev-docs/elastic-otel-collector/operator/onprem_kube_stack_values.yaml?token=GHSAT0AAAAAACR6STPQWQLOQA6I5ASIQ3WWZXALL7Q'`
    : undefined;

  return (
    <EuiPanel hasBorder paddingSize="xl">
      <EuiSteps
        steps={[
          {
            title: i18n.translate(
              'xpack.observability_onboarding.otelKubernetesPanel.installStackStepTitle',
              {
                defaultMessage: 'Install the OpenTelemetry Kube Stack',
              }
            ),
            children: command ? (
              <>
                <p>
                  {i18n.translate(
                    'xpack.observability_onboarding.otelKubernetesPanel.p.injectAutoinstrumentationLibrariesForLabel',
                    {
                      defaultMessage:
                        'Copy the command below to install and configure the OpenTelemetry Kube Stack:',
                    }
                  )}
                </p>
                <EuiSpacer />
                <EuiCodeBlock paddingSize="m" language="bash">
                  {command}
                </EuiCodeBlock>
                <EuiSpacer />
                <CopyToClipboardButton textToCopy={command} />
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
                        'Annotate your applications to inject auto-instrumentation libraries for the languages below:',
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
                />
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
              <GetStartedPanel
                integration="kubernetes"
                newTab={false}
                isLoading={false}
                actionLinks={[
                  {
                    id: CLUSTER_OVERVIEW_DASHBOARD_ID,
                    title: i18n.translate(
                      'xpack.observability_onboarding.otelKubernetesPanel.dashboardtitle',
                      {
                        defaultMessage:
                          'Check your Kubernetes health cluster with this ready-to-use dashboard:',
                      }
                    ),
                    label: i18n.translate(
                      'xpack.observability_onboarding.otelKubernetesPanel.dashboardlabel',
                      {
                        defaultMessage: 'Explore Kubernetes cluster',
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
                        defaultMessage: 'Open Services',
                      }
                    ),
                    href: apmLocator?.getRedirectUrl({ serviceName: undefined }) ?? '',
                  },
                ]}
              />
            ),
          },
        ]}
      />
      <FeedbackButtons flow="kubernetes" />
    </EuiPanel>
  );
};
