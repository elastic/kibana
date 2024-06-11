/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
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
  EuiLink,
} from '@elastic/eui';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FormattedMessage } from '@kbn/i18n-react';
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

  const AGENT_CDN_BASE_URL = 'artifacts.elastic.co/downloads/beats/elastic-agent';

  const allDatasetsLocator =
    share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);

  const hostsLocator = share.url.locators.get('HOSTS_LOCATOR');

  const [{ value: deeplinks }, getDeeplinks] = useAsyncFn(async () => {
    return {
      logs: allDatasetsLocator?.getRedirectUrl({
        type: 'logs',
      }),
      metrics: hostsLocator?.getRedirectUrl({}),
    };
  }, [allDatasetsLocator]);

  useEffect(() => {
    getDeeplinks();
  }, [getDeeplinks]);

  const installTabContents = [
    {
      id: 'mac',
      name: 'Mac',
      prompt:
        'Run the following commands in your terminal to download the collector and prepare the configuration.',
      content: `arch=$(if [[ $(arch) == "arm64" ]]; then echo "aarch64"; else echo $(arch); fi)

curl --output elastic-distro-${setup?.elasticAgentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${setup?.elasticAgentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fOL && mkdir "elastic-distro-${setup?.elasticAgentVersion}-darwin-$arch" && tar -xvf elastic-distro-${setup?.elasticAgentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${setup?.elasticAgentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${setup?.elasticAgentVersion}-darwin-$arch 
      
rm ./otel.yml && cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml && sed -i '' 's#<<ES_ENDPOINT>>#${setup?.elasticsearchUrl}#g' ./otel.yml && sed -i '' 's/<<ES_API_KEY>>/${apiKeyData?.apiKeyEncoded}/g' ./otel.yml`,
      check: './otelcol --config otel.yml',
      type: 'copy',
    },
    {
      id: 'linux',
      name: 'Linux',
      prompt:
        'Run the following commands in your terminal to download the collector and prepare the configuration.',
      content: `arch=$(if ([[ $(arch) == "arm" || $(arch) == "aarch64" ]]); then echo "arm64"; else echo $(arch); fi)

curl --output elastic-distro-${setup?.elasticAgentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${setup?.elasticAgentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fOL && mkdir elastic-distro-${setup?.elasticAgentVersion}-linux-$arch && tar -xvf elastic-distro-${setup?.elasticAgentVersion}-linux-$arch.tar.gz -C "elastic-distro-${setup?.elasticAgentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${setup?.elasticAgentVersion}-linux-$arch 
        
rm ./otel.yml && cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml && sed -i 's#<<ES_ENDPOINT>>#${setup?.elasticsearchUrl}#g' ./otel.yml && sed -i 's/<<ES_API_KEY>>/${apiKeyData?.apiKeyEncoded}/g' ./otel.yml`,
      check: './otelcol --config otel.yml',
      type: 'copy',
    },
    {
      id: 'windows',
      name: 'Windows',
      prompt:
        'Run the following commands in your terminal to download the collector and prepare the configuration.',
      content: `$ProgressPreference = 'SilentlyContinue'

Invoke-WebRequest -OutFile elastic-distro-${setup?.elasticAgentVersion}-windows-x86_64.zip -Uri https://${AGENT_CDN_BASE_URL}/elastic-agent-${setup?.elasticAgentVersion}-windows-x86_64.zip
Expand-Archive .\\elastic-distro-${setup?.elasticAgentVersion}-windows-x86_64.zip -DestinationPath .; Move-Item .\elastic-agent-${setup?.elasticAgentVersion}-windows-x86_64 .\\elastic-distro-${setup?.elasticAgentVersion}-windows-x86_64; Set-Location elastic-distro-${setup?.elasticAgentVersion}-windows-x86_64

remove-item ./otel.yml; copy-item ./otel_samples/hostmetrics.yml ./otel.yml; ((Get-Content ./otel.yml) -replace '<<ES_ENDPOINT>>', '${setup?.elasticsearchUrl}') -replace '<<ES_API_KEY>>', '${apiKeyData?.apiKeyEncoded}' | Set-Content ./otel.yml`,
      check: '.\\otelcol.exe --config .\\otel.yml',
      type: 'copy',
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      prompt: 'Install the collector via kubectl apply -f otel-collector-k8s.yml.',
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
                        {selectedTab === 'kubernetes'
                          ? i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.p.checkTheCollectorLabel',
                              {
                                defaultMessage:
                                  'Run the following command to check whether the collector is running correctly.',
                              }
                            )
                          : i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorLabel',
                              {
                                defaultMessage: 'Run the following command to start the collector',
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
                              'After running the previous command, come back and view your data.',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiSpacer />
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <img
                          src={http?.staticAssets.getPluginAssetHref('dashboard_illustration.svg')}
                          width={160}
                          alt="Illustration"
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow>
                        <EuiFlexGroup direction="column" gutterSize="xs">
                          {deeplinks?.logs && (
                            <>
                              <EuiFlexItem grow={false}>
                                <EuiText size="s">
                                  {i18n.translate(
                                    'xpack.observability_onboarding.otelLogsPanel.viewAndAnalyzeYourTextLabel',
                                    { defaultMessage: 'View and analyze your logs' }
                                  )}
                                </EuiText>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiLink
                                  data-test-subj="obltOnboardingExploreLogs"
                                  href={deeplinks.logs}
                                >
                                  {i18n.translate(
                                    'xpack.observability_onboarding.otelLogsPanel.exploreLogs',
                                    {
                                      defaultMessage: 'Open Logs Explorer',
                                    }
                                  )}
                                </EuiLink>
                              </EuiFlexItem>
                            </>
                          )}
                          <EuiSpacer size="s" />
                          {deeplinks?.metrics && (
                            <>
                              <EuiFlexItem grow={false}>
                                <EuiText size="s">
                                  {i18n.translate(
                                    'xpack.observability_onboarding.otelLogsPanel.viewAndAnalyzeYourMetricsTextLabel',
                                    { defaultMessage: 'View and analyze your metrics' }
                                  )}
                                </EuiText>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiLink
                                  data-test-subj="obltOnboardingExploreMetrics"
                                  href={deeplinks.metrics}
                                >
                                  {i18n.translate(
                                    'xpack.observability_onboarding.otelLogsPanel.exploreMetrics',
                                    {
                                      defaultMessage: 'Open Hosts',
                                    }
                                  )}
                                </EuiLink>
                              </EuiFlexItem>
                            </>
                          )}
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                    <EuiSpacer />
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.observability_onboarding.otelLogsPanel.troubleshooting"
                        defaultMessage="Find more details and troubleshooting solution in our documentation. {link}"
                        values={{
                          link: (
                            <EuiLink
                              data-test-subj="observabilityOnboardingOtelLogsPanelDocumentationLink"
                              href="https://www.elastic.co/guide/en/observability/current/otel-getting-started.html"
                              target="_blank"
                              external
                            >
                              {i18n.translate(
                                'xpack.observability_onboarding.otelLogsPanel.documentationLink',
                                { defaultMessage: 'Open documentation' }
                              )}
                            </EuiLink>
                          ),
                        }}
                      />
                    </EuiText>
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
