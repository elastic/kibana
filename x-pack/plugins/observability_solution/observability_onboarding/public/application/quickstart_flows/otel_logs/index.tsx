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
kind: ServiceAccount
metadata:
  name: daemonset-opentelemetry-collector
  namespace: default
  labels:
    app.kubernetes.io/name: elastic-opentelemetry-collector
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: daemonset-opentelemetry-collector-agent
  namespace: default
  labels:
    app.kubernetes.io/name: elastic-opentelemetry-collector
data:
  otel.yaml: |
    exporters:
      debug:
        verbosity: detailed
      elasticsearch/logs:
        endpoints: 
        - ${setup?.elasticsearchUrl}
        api_key: ${apiKeyData?.apiKeyEncoded}
        logs_index: otel_logs_index
        mapping:
          mode: ecs
        sending_queue:
          enabled: true
          num_consumers: 20
          queue_size: 1000
    processors:
      k8sattributes:
        filter:
          node_from_env_var: K8S_NODE_NAME
        passthrough: false
        pod_association:
          - sources:
              - from: resource_attribute
                name: k8s.pod.ip
          - sources:
              - from: resource_attribute
                name: k8s.pod.uid
          - sources:
              - from: connection
        extract:
          metadata:
            - "k8s.namespace.name"
            - "k8s.deployment.name"
            - "k8s.statefulset.name"
            - "k8s.daemonset.name"
            - "k8s.cronjob.name"
            - "k8s.job.name"
            - "k8s.node.name"
            - "k8s.pod.name"
            - "k8s.pod.uid"
            - "k8s.pod.start_time"
    receivers:
      filelog:
        retry_on_failure:
          enabled: true
        start_at: end
        exclude:
        - /var/log/pods/default_daemonset-opentelemetry-collector*_*/elastic-opentelemetry-collector/*.log
        include:
        - /var/log/pods/*/*/*.log
        include_file_name: false
        include_file_path: true
        operators:
        - id: get-format
          routes:
          - expr: body matches "^\\{"
            output: parser-docker
          - expr: body matches "^[^ Z]+ "
            output: parser-crio
          - expr: body matches "^[^ Z]+Z"
            output: parser-containerd
          type: router
        - id: parser-crio
          regex: ^(?P<time>[^ Z]+) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$
          timestamp:
            layout: 2006-01-02T15:04:05.999999999Z07:00
            layout_type: gotime
            parse_from: attributes.time
          type: regex_parser
        - combine_field: attributes.log
          combine_with: ""
          id: crio-recombine
          is_last_entry: attributes.logtag == 'F'
          max_log_size: 102400
          output: extract_metadata_from_filepath
          source_identifier: attributes["log.file.path"]
          type: recombine
        - id: parser-containerd
          regex: ^(?P<time>[^ ^Z]+Z) (?P<stream>stdout|stderr) (?P<logtag>[^ ]*) ?(?P<log>.*)$
          timestamp:
            layout: '%Y-%m-%dT%H:%M:%S.%LZ'
            parse_from: attributes.time
          type: regex_parser
        - combine_field: attributes.log
          combine_with: ""
          id: containerd-recombine
          is_last_entry: attributes.logtag == 'F'
          max_log_size: 102400
          output: extract_metadata_from_filepath
          source_identifier: attributes["log.file.path"]
          type: recombine
        - id: parser-docker
          output: extract_metadata_from_filepath
          timestamp:
            layout: '%Y-%m-%dT%H:%M:%S.%LZ'
            parse_from: attributes.time
          type: json_parser
        - id: extract_metadata_from_filepath
          parse_from: attributes["log.file.path"]
          regex: ^.*\/(?P<namespace>[^_]+)_(?P<pod_name>[^_]+)_(?P<uid>[a-f0-9\-]+)\/(?P<container_name>[^\._]+)\/(?P<restart_count>\d+)\.log$
          type: regex_parser
        - from: attributes.stream
          to: attributes["log.iostream"]
          type: move
        - from: attributes.container_name
          to: resource["k8s.container.name"]
          type: move
        - from: attributes.namespace
          to: resource["k8s.namespace.name"]
          type: move
        - from: attributes.pod_name
          to: resource["k8s.pod.name"]
          type: move
        - from: attributes.restart_count
          to: resource["k8s.container.restart_count"]
          type: move
        - from: attributes.uid
          to: resource["k8s.pod.uid"]
          type: move
        - from: attributes.log
          to: body
          type: move
    service:
      pipelines:
        logs:
          exporters:
          # ES exported is disabled until https://github.com/open-telemetry/opentelemetry-collector-contrib/pull/33454
          # is included in the distro
          #- elasticsearch/logs 
          - debug
          processors:
          - k8sattributes
          receivers:
          - filelog
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: daemonset-opentelemetry-collector-agent
  namespace: default
  labels:
    app.kubernetes.io/name: elastic-opentelemetry-collector
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: elastic-opentelemetry-collector
      component: agent-collector
  template:
    metadata:
      labels:
        app.kubernetes.io/name: elastic-opentelemetry-collector
        component: agent-collector
    spec:
      serviceAccountName: daemonset-opentelemetry-collector
      securityContext:
        runAsUser: 0
        runAsGroup: 0
      containers:
        - name: elastic-opentelemetry-collector
          command: [/usr/share/elastic-agent/elastic-agent]
          args: ["otel", "-c", "/etc/elastic-agent/otel.yaml"]
          image: docker.elastic.co/beats/elastic-agent:${setup?.elasticAgentVersion}
          imagePullPolicy: IfNotPresent
          env:
            - name: MY_POD_IP
              valueFrom:
                fieldRef:
                  apiVersion: v1
                  fieldPath: status.podIP
            - name: ES_ENDPOINT
              valueFrom:
                secretKeyRef:
                  key: es_endpoint
                  name: elastic-secret
            - name: ES_API_KEY
              valueFrom:
                secretKeyRef:
                  key: es_api_key
                  name: elastic-secret
          volumeMounts:
            - mountPath: /etc/elastic-agent/otel.yaml
              name: opentelemetry-collector-configmap
              readOnly: true
              subPath: otel.yaml
            - name: varlogpods
              mountPath: /var/log/pods
              readOnly: true
            - name: varlibdockercontainers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: varlibotelcol
              mountPath: /var/lib/otelcol
      volumes:
        - name: opentelemetry-collector-configmap
          configMap:
            name: daemonset-opentelemetry-collector-agent
            defaultMode: 0640
        - name: varlogpods
          hostPath:
            path: /var/log/pods
        - name: varlibdockercontainers
          hostPath:
            path: /var/lib/docker/containers
        - name: varlibotelcol
          hostPath:
            path: /var/lib/otelcol
            type: DirectoryOrCreate
      hostNetwork: false
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: daemonset-opentelemetry-collector
  labels:
    app.kubernetes.io/name: elastic-opentelemetry-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "namespaces", "nodes"]
    verbs: ["get", "watch", "list"]
  - apiGroups: ["apps"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions"]
    resources: ["replicasets"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: daemonset-opentelemetry-collector
  labels:
    app.kubernetes.io/name: elastic-opentelemetry-collector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: daemonset-opentelemetry-collector
subjects:
  - kind: ServiceAccount
    name: daemonset-opentelemetry-collector
    namespace: default
---`,
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
                      <EuiCodeBlock language="sh" isCopyable overflowHeight={300}>
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
