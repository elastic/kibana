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
  EuiTab,
  EuiTabs,
  EuiText,
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
import { SystemIntegrationBanner } from '../shared/system_integration_banner';

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
    services: { share },
  } = useKibana<ObservabilityOnboardingPluginSetupDeps>();

  const allDatasetsLocator =
    share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);

  const installTabContents = [
    {
      id: 'mac',
      name: 'Mac',
      content: `curl --proto '=https' --tlsv1.2 -fOL https://snapshots.elastic.co/8.14.0-6b2f3648/downloads/beats/elastic-agent/elastic-agent-8.14.0-SNAPSHOT-darwin-x86_64.tar.gz
      tar -xvf elastic-agent-8.13.4-darwin-x86_64.tar.gz
      rm elastic-agent-8.13.4-darwin-x86_64/otel.yml && cp elastic-agent-8.13.4-darwin-x86_64/otel_templates/logs_hostmetrics.yaml elastic-agent-8.13.4-darwin-x86_64/otel.yml
      sed -i '' 's/<<ES_ENDPOINT>>/'${setup?.elasticsearchUrl}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml && sed -i '' 's/<<ES_API_KEY>>/'${apiKeyData?.apiKeyEncoded}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml
      
      elastic-agent-8.13.4-darwin-x86_64/elastic-agent otel`,
    },
    {
      id: 'linux',
      name: 'Linux',
      content: `# not final
      curl --proto '=https' --tlsv1.2 -fOL https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.100.0/otelcol_0.100.0_linux_amd64.tar.gz
tar -xvf otelcol_0.100.0_linux_amd64.tar.gz
curl --proto '=https' --tlsv1.2 -fOL https://github.com/elastic/observability/releases/download/v1.0.0/otel-collector-mac.yml
# Use sed to add your API key and Elasticsearch endpoint
sed -i '' 's/APIKEY/${apiKeyData?.apiKeyEncoded}/g' otel-collector-linux.yml
sed -i '' 's/https:\/\/CHANGEME.elastic.cloud/${setup?.elasticsearchUrl}/g' otel-collector-linux.yml`,
    },
    {
      id: 'windows',
      name: 'Windows',
      content: `# not final
      curl --proto '=https' --tlsv1.2 -fOL https://snapshots.elastic.co/8.14.0-6b2f3648/downloads/beats/elastic-agent/elastic-agent-8.14.0-SNAPSHOT-darwin-x86_64.tar.gz
      tar -xvf elastic-agent-8.13.4-darwin-x86_64.tar.gz
      rm elastic-agent-8.13.4-darwin-x86_64/otel.yml && cp elastic-agent-8.13.4-darwin-x86_64/otel_templates/logs_hostmetrics.yaml elastic-agent-8.13.4-darwin-x86_64/otel.yml
      sed -i '' 's/<<ES_ENDPOINT>>/'${setup?.elasticsearchUrl}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml && sed -i '' 's/<<ES_API_KEY>>/'${apiKeyData?.apiKeyEncoded}'/g' elastic-agent-8.13.4-darwin-x86_64/otel.yml
      
      elastic-agent-8.13.4-darwin-x86_64/elastic-agent otel`,
    },
  ];

  const [selectedTab, setSelectedTab] = React.useState(installTabContents[0].id);

  return (
    <EuiPanel hasBorder>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow>
              {i18n.translate(
                'xpack.observability_onboarding.otelLogsPanel.otelLogsModalHeaderTitleLabel',
                { defaultMessage: 'OTel logs and host metrics' }
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
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <p>
              {i18n.translate(
                'xpack.observability_onboarding.otelLogsPanel.p.collectLogsWithOpenTelemetryLabel',
                { defaultMessage: 'Collect logs with OpenTelemetry.' }
              )}
            </p>
          </EuiFlexItem>
          <EuiFlexItem>
            <SystemIntegrationBanner />
          </EuiFlexItem>
          <EuiFlexItem>
            <ApiKeyBanner status={apiKeyStatus} payload={apiKeyData} error={error} />
          </EuiFlexItem>
          <EuiSteps
            steps={[
              {
                title: 'Install and run the collector',
                children: (
                  <>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.otelLogsPanel.p.firstYouNeedToLabel',
                          {
                            defaultMessage: 'First, you need to download and install the collector',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiTabs>
                      {installTabContents.map((tab) => (
                        <EuiTab
                          onClick={() => setSelectedTab(tab.id)}
                          isSelected={tab.id === selectedTab}
                          key={tab.id}
                        >
                          {tab.name}
                        </EuiTab>
                      ))}
                    </EuiTabs>

                    <EuiCodeBlock language="sh" isCopyable>
                      {installTabContents.find((tab) => tab.id === selectedTab)?.content}
                    </EuiCodeBlock>
                  </>
                ),
              },
              {
                title: 'Validate everything is running properly',
                children: (
                  <>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorOrLabel',
                          {
                            defaultMessage:
                              'Check that the collector is running properly by running the following command:',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiCodeBlock language="yaml" isCopyable>
                      {`run_collector`}
                    </EuiCodeBlock>
                  </>
                ),
              },
              {
                title: 'Look at logs',
                children: (
                  <>
                    <EuiText>
                      <p>
                        {i18n.translate(
                          'xpack.observability_onboarding.otelLogsPanel.p.waitForTheDataLabel',
                          {
                            defaultMessage:
                              'Wait for the data to actually start flowing. Once it does, explore the logs:',
                          }
                        )}
                      </p>
                    </EuiText>
                    <EuiSpacer />
                    <EuiButton
                      data-test-subj="obltOnboardingExploreLogs"
                      color="success"
                      fill
                      iconType="magnifyWithPlus"
                      onClick={() => {
                        allDatasetsLocator!.navigate({
                          type: 'logs',
                        });
                      }}
                    >
                      {i18n.translate('xpack.observability_onboarding.steps.exploreLogs', {
                        defaultMessage: 'Explore logs',
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
