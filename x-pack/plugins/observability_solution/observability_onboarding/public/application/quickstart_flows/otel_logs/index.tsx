/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButton,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
  EuiText,
  EuiIcon,
  EuiButtonGroup,
  EuiCopy,
} from '@elastic/eui';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ObservabilityOnboardingPluginSetupDeps } from '../../../plugin';
import { ApiKeyBanner } from '../custom_logs/api_key_banner';
import { useFetcher } from '../../../hooks/use_fetcher';
import { MultiIntegrationInstallBanner } from './multi_integration_install_banner';

export const OtelLogsPanel: React.FC = () => {
  const {
    data: apiKeyData,
    status: apiKeyStatus,
    error,
  } = useFetcher((callApi) => {
    return callApi('POST /internal/observability_onboarding/otel/api_key', {});
  }, []);

  const { data: setup } = useFetcher((callApi) => {
    return callApi('GET /internal/observability_onboarding/logs/setup/environment');
  }, []);

  const {
    services: { share, http },
  } = useKibana<ObservabilityOnboardingPluginSetupDeps>();

  const allDatasetsLocator =
    share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);

  const installTabContents = [
    {
      id: 'mac',
      name: 'Mac',
      prompt: 'Run the following commands in your terminal to install the collector.',
      content: `curl --proto '=https' --tlsv1.2 -fOL https://snapshots.elastic.co/8.14.0-6b2f3648/downloads/beats/elastic-agent/elastic-agent-8.14.0-SNAPSHOT-darwin-x86_64.tar.gz
      tar -xvf elastic-agent-8.13.4-darwin-x86_64.tar.gz
      rm elastic-agent-8.13.4-darwin-x86_64/otel.yml && cp elastic-agent-8.13.4-darwin-x86_64/otel_templates/logs_hostmetrics.yaml elastic-agent-8.13.4-darwin-x86_64/otel.yml
      sed -i '' 's/<<ES_ENDPOINT>>/'${setup?.elasticsearchUrl}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml && sed -i '' 's/<<ES_API_KEY>>/'${apiKeyData?.apiKeyEncoded}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml
      
      elastic-agent-8.13.4-darwin-x86_64/elastic-agent otel`,
      check: 'run_collector',
      type: 'copy',
    },
    {
      id: 'linux',
      name: 'Linux',
      prompt: 'Run the following commands in your terminal to install the collector.',
      content: `# not final
      curl --proto '=https' --tlsv1.2 -fOL https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.100.0/otelcol_0.100.0_linux_amd64.tar.gz
tar -xvf otelcol_0.100.0_linux_amd64.tar.gz
curl --proto '=https' --tlsv1.2 -fOL https://github.com/elastic/observability/releases/download/v1.0.0/otel-collector-mac.yml
# Use sed to add your API key and Elasticsearch endpoint
sed -i '' 's/APIKEY/${apiKeyData?.apiKeyEncoded}/g' otel-collector-linux.yml
sed -i '' 's/https:\/\/CHANGEME.elastic.cloud/${setup?.elasticsearchUrl}/g' otel-collector-linux.yml`,
      check: 'run_collector',
      type: 'copy',
    },
    {
      id: 'windows',
      name: 'Windows',
      prompt: 'Run the following commands in your terminal to install the collector.',
      content: `# not final
      curl --proto '=https' --tlsv1.2 -fOL https://snapshots.elastic.co/8.14.0-6b2f3648/downloads/beats/elastic-agent/elastic-agent-8.14.0-SNAPSHOT-darwin-x86_64.tar.gz
      tar -xvf elastic-agent-8.13.4-darwin-x86_64.tar.gz
      rm elastic-agent-8.13.4-darwin-x86_64/otel.yml && cp elastic-agent-8.13.4-darwin-x86_64/otel_templates/logs_hostmetrics.yaml elastic-agent-8.13.4-darwin-x86_64/otel.yml
      sed -i '' 's/<<ES_ENDPOINT>>/'${setup?.elasticsearchUrl}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml && sed -i '' 's/<<ES_API_KEY>>/'${apiKeyData?.apiKeyEncoded}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml
      
      elastic-agent-8.13.4-darwin-x86_64/elastic-agent otel`,
      check: 'run_collector',
      type: 'copy',
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      prompt: 'Install the following via kubectl apply -f otel-collector-k8s.yml.',
      content: `apiVersion: v1
      kind: Service
      metadata:
        name: my-nginx-svc
        labels:
          app: nginx
      spec:
        type: LoadBalancer
        ports:
        - port: 80
        selector:
          app: nginx
      ---
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: my-nginx
        labels:
          app: nginx
        env:
        - name: ELASTICSEARCH_URL
          value: ${setup?.elasticsearchUrl}
        - name: ELASTICSEARCH_API_KEY
          value: ${apiKeyData?.apiKeyEncoded}
      spec:
        replicas: 3
        selector:
          matchLabels:
            app: nginx
        template:
          metadata:
            labels:
              app: nginx
          spec:
            containers:
            - name: nginx
              image: nginx:1.14.2
              ports:
              - containerPort: 80`,
      type: 'download',
      check: 'kubectl get pods -l app=nginx',
      fileName: 'otel-collector-k8s.yml',
    },
  ];

  const [selectedTab, setSelectedTab] = React.useState(installTabContents[0].id);

  const selectedContent = installTabContents.find((tab) => tab.id === selectedTab)!;

  return (
    <EuiPanel hasBorder>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="l" alignItems="flexStart">
            {http && (
              <EuiFlexItem grow={false}>
                <EuiPanel paddingSize="s">
                  <EuiIcon
                    type={http?.staticAssets.getPluginAssetHref('opentelemetry.svg')}
                    size="xxl"
                  />
                </EuiPanel>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow>
              <EuiFlexGroup gutterSize="m" direction="column">
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow>
                    {i18n.translate(
                      'xpack.observability_onboarding.otelLogsPanel.otelLogsModalHeaderTitleLabel',
                      { defaultMessage: 'OpenTelemetry' }
                    )}
                  </EuiFlexItem>

                  <EuiFlexItem grow={false}>
                    <EuiBetaBadge
                      label={i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.techPreviewBadge.label',
                        {
                          defaultMessage: 'Technical preview',
                        }
                      )}
                      size="m"
                      color="hollow"
                      tooltipContent={i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.techPreviewBadge.tooltip',
                        {
                          defaultMessage:
                            'This functionality is in technical preview and may be changed or removed completely in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.',
                        }
                      )}
                      tooltipPosition={'right'}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiText size="s" color="subdued">
                  <p>
                    {i18n.translate(
                      'xpack.observability_onboarding.otelLogsPanel.p.collectLogsWithOpenTelemetryLabel',
                      { defaultMessage: 'Collect logs and host metrics using the OTel collector.' }
                    )}
                  </p>
                </EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          <MultiIntegrationInstallBanner />
          {error && (
            <EuiFlexItem>
              <ApiKeyBanner status={apiKeyStatus} payload={apiKeyData} error={error} />
            </EuiFlexItem>
          )}
          <EuiSteps
            steps={[
              {
                title: 'Install and run the collector',
                children: (
                  <EuiFlexGroup direction="column">
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.otelLogsPanel.p.firstYouNeedToLabel',
                          {
                            defaultMessage:
                              'Select your platform, and run the command on your host.',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiButtonGroup
                      legend={i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.choosePlatform',
                        { defaultMessage: 'Choose platform' }
                      )}
                      options={installTabContents.map(({ id, name }) => ({
                        id,
                        label: name,
                      }))}
                      type="single"
                      idSelected={selectedTab}
                      onChange={(id: string) => {
                        setSelectedTab(id);
                      }}
                    />

                    <EuiFlexItem>
                      <EuiCodeBlock language="sh" isCopyable>
                        {selectedContent.content}
                      </EuiCodeBlock>
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <EuiText>
                        <p>{selectedContent.prompt}</p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem align="left">
                      <EuiFlexGroup>
                        {selectedContent.type === 'download' ? (
                          <EuiButton
                            iconType="download"
                            color="primary"
                            href={`data:application/yaml;base64,${Buffer.from(
                              selectedContent.content,
                              'utf8'
                            ).toString('base64')}`}
                            download={selectedContent.fileName}
                            fill
                            target="_blank"
                            data-test-subj="obltOnboardingOtelDownloadConfig"
                          >
                            {i18n.translate(
                              'xpack.observability_onboarding.installOtelCollector.configStep.downloadConfigButton',
                              { defaultMessage: 'Download config file' }
                            )}
                          </EuiButton>
                        ) : (
                          <EuiCopy textToCopy={selectedContent.content}>
                            {(copy) => (
                              <EuiButton
                                color="primary"
                                data-test-subj="observabilityOnboardingOtelLogsPanelButton"
                                fill
                                iconType="copyClipboard"
                                onClick={copy}
                              >
                                {i18n.translate(
                                  'xpack.observability_onboarding.installOtelCollector.configStep.copyCommand',
                                  { defaultMessage: 'Copy to clipboard' }
                                )}
                              </EuiButton>
                            )}
                          </EuiCopy>
                        )}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    <EuiSpacer />
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorOrLabel',
                          {
                            defaultMessage:
                              'Run the following command to make sure the collector is running properly.',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiCodeBlock language="yaml" isCopyable>
                      {selectedContent.check}
                    </EuiCodeBlock>
                  </EuiFlexGroup>
                ),
              },
              {
                title: 'Visualize your data',
                children: (
                  <>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.otelLogsPanel.p.waitForTheDataLabel',
                          {
                            defaultMessage:
                              'After running the previous command, view your data in Logs Explorer.',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiSpacer />
                    <EuiButton
                      data-test-subj="obltOnboardingExploreLogs"
                      color="primary"
                      fill
                      iconType="eye"
                      onClick={() => {
                        allDatasetsLocator!.navigate({
                          type: 'logs',
                        });
                      }}
                    >
                      {i18n.translate('xpack.observability_onboarding.otelLogsPanel.exploreLogs', {
                        defaultMessage: 'Open Logs Explorer',
                      })}
                    </EuiButton>
                  </>
                ),
              },
            ]}
          />
        </EuiFlexGroup>
      </EuiModalBody>
    </EuiPanel>
  );
};
