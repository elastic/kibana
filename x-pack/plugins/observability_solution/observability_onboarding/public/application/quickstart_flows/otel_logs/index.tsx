/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCodeBlock,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiSteps,
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

const getCollectorConfig = (
  host: string = 'https://CHANGEME.elastic.cloud',
  apikey: string = 'CHANGEME'
) => `receivers:
  filelog:
    include:
      # Common log file locations on different systems. Uncomment the paths relevant to your deployment environment.
      # Kubernetes Container Logs
      # - /var/log/containers/*.log  # Logs from containers, useful for debugging container-specific issues
      # - /var/log/pods/*.log        # Logs from pods, includes aggregated container logs per pod
      # - /etc/kubernetes/audit/*.log  # Kubernetes audit logs, essential for security and compliance monitoring

      # Linux System Logs
      # - /var/log/*.log
      # - /var/log/**/*.log  # Deep search for any log files within the /var/log directory

      # Application Logs in /var/log
      # - /var/log/myapp/*.log  # Targeted application logs, modify 'myapp' to your application's log directory

      # macOS System Logs
      # - /var/log/*.log
      # - /var/log/**/*.log  # General system logs for macOS

      # macOS Application Logs
      # - /Library/Logs/**/*.log  # Logs for applications installed for all users
      # - /Users/*/Library/Logs/**/*.log  # Logs for applications installed per user

      # Windows System Logs
      # - C:/ProgramData/MyApp/Logs/*.log
      # - C:/ProgramData/MyApp/Logs/**/*.log  # System-wide application logs on Windows

      # Windows User Logs
      # - C:/Users/*/AppData/Local/MyApp/Logs/*.log
      # - C:/Users/*/AppData/Local/MyApp/Logs/**/*.log  # Per-user application logs on Windows
exporters:
  elasticsearch:
    endpoints: [${host}]
    api_key: "${apikey}"
    # Configure your Elasticsearch endpoint and API key for exporting data.

processors:
  batch:
    # Batches log entries to improve throughput and decrease resource consumption.
  memory_limiter:
    # Limits the memory usage of the collector, essential in resource-constrained environments.
    limit_mib: 400  # Maximum memory in MiB that the collector can use.
    spike_limit_mib: 100  # Additional memory allowed during spikes in data.
    check_interval: 5s  # Frequency at which memory usage is checked.

extensions:
  zpages:
    # Provides an HTTP endpoint for live debugging and zPages that shows collector metrics and trace data.

service:
  extensions: [zpages]
  pipelines:
    logs:
      receivers: [filelog]
      processors: [memory_limiter, batch]
      exporters: [elasticsearch]
      # Defines the log pipeline using filelog receiver, memory limiter and batch processors, and Elasticsearch exporter.
`;

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

  const configureAgentYaml = getCollectorConfig(setup?.apiEndpoint, apiKeyData?.apiKeyEncoded);

  return (
    <EuiPanel hasBorder>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate(
            'xpack.observability_onboarding.otelLogsPanel.otelLogsModalHeaderTitleLabel',
            { defaultMessage: 'OTel Logs' }
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <p>
          {i18n.translate(
            'xpack.observability_onboarding.otelLogsPanel.p.collectLogsWithOpenTelemetryLabel',
            { defaultMessage: 'Collect logs with OpenTelemetry.' }
          )}
        </p>
        <EuiSpacer />
        <ApiKeyBanner status={apiKeyStatus} payload={apiKeyData} error={error} />
        <EuiSpacer />
        <EuiSteps
          steps={[
            {
              title: 'Install the Collector',
              children: (
                <>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.p.firstYouNeedToLabel',
                        { defaultMessage: 'First, you need to download and install the collector' }
                      )}
                    </p>
                  </EuiText>
                  <EuiCodeBlock language="yaml" isCopyable>
                    {`curl --proto '=https' --tlsv1.2 -fOL https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.100.0/otelcol_0.100.0_darwin_amd64.tar.gz
tar -xvf otelcol_0.100.0_darwin_amd64.tar.gz
`}
                  </EuiCodeBlock>
                </>
              ),
            },
            {
              title: 'Configure the collector',
              children: (
                <>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.p.downloadTheConfigFromLabel',
                        {
                          defaultMessage:
                            'Download the config from below and put it into this/is/the/path.yml',
                        }
                      )}
                    </p>
                  </EuiText>
                  <EuiCodeBlock language="yaml" isCopyable>
                    {configureAgentYaml}
                  </EuiCodeBlock>
                  <EuiSpacer />
                  <EuiButton
                    iconType="download"
                    color="primary"
                    href={`data:application/yaml;base64,${Buffer.from(
                      configureAgentYaml,
                      'utf8'
                    ).toString('base64')}`}
                    download="otel-collector.yml"
                    target="_blank"
                    data-test-subj="obltOnboardingConfigureElasticAgentStepDownloadConfig"
                  >
                    {i18n.translate(
                      'xpack.observability_onboarding.installElasticAgent.configStep.downloadConfigButton',
                      { defaultMessage: 'Download config file' }
                    )}
                  </EuiButton>
                </>
              ),
            },
            {
              title: 'Run the collector',
              children: (
                <>
                  <EuiText>
                    <p>
                      {i18n.translate(
                        'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorOrLabel',
                        {
                          defaultMessage:
                            'Start the collector or smth, idk. Also make sure it actually works.',
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
      </EuiModalBody>
    </EuiPanel>
  );
};
