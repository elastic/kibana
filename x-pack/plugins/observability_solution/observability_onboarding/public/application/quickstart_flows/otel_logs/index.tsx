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
  EuiImage,
} from '@elastic/eui';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { FormattedMessage } from '@kbn/i18n-react';
import { ObservabilityOnboardingAppServices } from '../../..';
import { ApiKeyBanner } from '../custom_logs/api_key_banner';
import { useFetcher } from '../../../hooks/use_fetcher';
import { MultiIntegrationInstallBanner } from './multi_integration_install_banner';

const HOST_COMMAND = i18n.translate(
  'xpack.observability_onboarding.otelLogsPanel.p.runTheCommandOnYourHostLabel',
  {
    defaultMessage:
      'Run the following command on your host to download and configure the collector.',
  }
);

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
    services: {
      share,
      http,
      // context: { isServerless, stackVersion },
    },
  } = useKibana<ObservabilityOnboardingAppServices>();

  const AGENT_CDN_BASE_URL = 'snapshots.elastic.co/8.14.2-802f0e3c/downloads/beats/elastic-agent';
  const agentVersion = '8.14.2-SNAPSHOT';
  // TODO uncomment before merge
  // const AGENT_CDN_BASE_URL = 'artifacts.elastic.co/downloads/beats/elastic-agent';
  // const agentVersion = isServerless ? setup?.elasticAgentVersion : stackVersion;
  // const agentVersion = '8.14.2-45882135';

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
      id: 'kubernetes',
      name: 'Kubernetes',
      prompt: (
        <>
          <EuiText>
            <p>
              {i18n.translate(
                'xpack.observability_onboarding.otelLogsPanel.kubernetesApplyCommandPromptLabel',
                {
                  defaultMessage:
                    'From the directory where the manifest is downloaded, run the following command to install the collector on every node of your cluster:',
                }
              )}
            </p>
          </EuiText>
          <CopyableCodeBlock
            content={`kubectl create secret generic elastic-secret \
--from-literal=es_endpoint='${setup?.elasticsearchUrl}' \                 
--from-literal=es_api_key='${apiKeyData?.apiKeyEncoded}'

kubectl apply -f otel-collector-k8s.yml`}
          />
        </>
      ),
      firstStepTitle: i18n.translate(
        'xpack.observability_onboarding.otelLogsPanel.steps.downloadManifest',
        { defaultMessage: 'Download the manifest:' }
      ),
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
      elasticsearch:
        endpoints: 
        - \${env:ES_ENDPOINT}
        api_key: \${env:ES_API_KEY}
        logs_index: logs-otel.generic-default
        # Metrics are not supported yet
        #metrics_index: metrics-otel.generic-default
        mapping:
          mode: ecs
        sending_queue:
          enabled: true
          num_consumers: 20
          queue_size: 1000
    processors:
      resourcedetection/eks:
        detectors: [env, eks]
        timeout: 15s
        override: true
        eks:
          resource_attributes:
            k8s.cluster.name:
              enabled: true
      resource/k8s:
        attributes:
          - key: service.name
            from_attribute: app.label.component
            action: insert
      resource/cloud:
        attributes:
          - key: cloud.instance.id
            from_attribute: host.id
            action: insert
      resourcedetection/system:
        detectors: ["system", "ec2"]
        system:
          hostname_sources: [ "os" ]
          resource_attributes:
            host.name:
              enabled: true
            host.id:
              enabled: false
            host.arch:
              enabled: true
            host.ip:
              enabled: true
            host.mac:
              enabled: true
            host.cpu.vendor.id:
              enabled: true
            host.cpu.family:
              enabled: true
            host.cpu.model.id:
              enabled: true
            host.cpu.model.name:
              enabled: true
            host.cpu.stepping:
              enabled: true
            host.cpu.cache.l2.size:
              enabled: true
            os.description:
              enabled: true
            os.type:
              enabled: true
        ec2:
          resource_attributes:
            host.name:
              enabled: false
            host.id:
              enabled: true
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
          labels:
            - tag_name: app.label.component
              key: app.kubernetes.io/component
              from: pod
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
        - id: container-parser
          type: container
      hostmetrics:
        collection_interval: 10s
        root_path: /hostfs
        scrapers:
          cpu:
            metrics:
              system.cpu.utilization:
                enabled: true
              system.cpu.logical.count:
                enabled: true
          memory:
            metrics:
              system.memory.utilization:
                enabled: true
          process:
            metrics:
              process.threads:
                enabled: true
              process.open_file_descriptors:
                enabled: true
              process.memory.utilization:
                enabled: true
              process.disk.operations:
                enabled: true
          network:
          processes:
          load:
          disk:
      kubeletstats:
        auth_type: serviceAccount
        collection_interval: 20s
        endpoint: \${env:K8S_NODE_NAME}:10250
        node: '\${env:K8S_NODE_NAME}'
        k8s_api_config:
          auth_type: serviceAccount
        metric_groups:
          - node
          - pod
          - node
          - volume
        metrics:
          k8s.pod.cpu.node.utilization:
            enabled: true
          k8s.container.cpu_limit_utilization:
            enabled: true
          k8s.pod.cpu_limit_utilization:
            enabled: true
          k8s.container.cpu_request_utilization:
            enabled: true
          k8s.container.memory_limit_utilization:
            enabled: true
          k8s.pod.memory_limit_utilization:
            enabled: true
          k8s.container.memory_request_utilization:
            enabled: true
          k8s.node.uptime:
            enabled: true
          k8s.node.cpu.usage:
            enabled: true
          k8s.pod.cpu.usage:
            enabled: true
        extra_metadata_labels:
          - container.id

    service:
      pipelines:
        logs:
          exporters:
          - elasticsearch 
          #- debug
          processors:
          - k8sattributes
          - resourcedetection/system
          - resourcedetection/eks
          - resource/k8s
          - resource/cloud
          receivers:
          - filelog
#        metrics:
#          exporters:
#          #- elasticsearch
#          - debug
#          processors:
#          - k8sattributes
#          - resourcedetection/system
#          - resourcedetection/eks
#          - resource/k8s
#          - resource/cloud
#          receivers:
#          - kubeletstats
#          - hostmetrics
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
          image: docker.elastic.co/beats/elastic-agent:${agentVersion}
          imagePullPolicy: IfNotPresent
          env:
            - name: MY_POD_IP
              valueFrom:
                fieldRef:
                  apiVersion: v1
                  fieldPath: status.podIP
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
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
            - name: hostfs
              mountPath: /hostfs
              readOnly: true
              mountPropagation: HostToContainer

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
        - name: hostfs
          hostPath:
            path: /
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
    resources: ["daemonsets", "deployments", "replicasets", "statefulsets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions"]
    resources: ["daemonsets", "deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [ "" ]
    resources: [ "nodes/stats" ]
    verbs: [ "get", "watch", "list" ]
  - apiGroups: [ "" ]
    resources: [ "nodes/proxy" ]
    verbs: [ "get" ]
  - apiGroups: [ "" ]
    resources: ["configmaps"]
    verbs: ["get"]
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
      fileName: 'otel-collector-k8s.yml',
    },
    {
      id: 'linux',
      name: 'Linux',
      firstStepTitle: HOST_COMMAND,
      content: `arch=$(if ([[ $(arch) == "arm" || $(arch) == "aarch64" ]]); then echo "arm64"; else echo $(arch); fi)

curl --output elastic-distro-${agentVersion}-linux-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-linux-$arch.tar.gz --proto '=https' --tlsv1.2 -fOL && mkdir elastic-distro-${agentVersion}-linux-$arch && tar -xvf elastic-distro-${agentVersion}-linux-$arch.tar.gz -C "elastic-distro-${agentVersion}-linux-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-linux-$arch 
        
rm ./otel.yml && cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml && sed -i 's#<<ES_ENDPOINT>>#${setup?.elasticsearchUrl}#g' ./otel.yml && sed -i 's/<<ES_API_KEY>>/${apiKeyData?.apiKeyEncoded}/g' ./otel.yml`,
      start: './otelcol --config otel.yml',
      type: 'copy',
    },
    {
      id: 'mac',
      name: 'Mac',
      firstStepTitle: HOST_COMMAND,
      content: `arch=$(if [[ $(arch) == "arm64" ]]; then echo "aarch64"; else echo $(arch); fi)

curl --output elastic-distro-${agentVersion}-darwin-$arch.tar.gz --url https://${AGENT_CDN_BASE_URL}/elastic-agent-${agentVersion}-darwin-$arch.tar.gz --proto '=https' --tlsv1.2 -fOL && mkdir "elastic-distro-${agentVersion}-darwin-$arch" && tar -xvf elastic-distro-${agentVersion}-darwin-$arch.tar.gz -C "elastic-distro-${agentVersion}-darwin-$arch" --strip-components=1 && cd elastic-distro-${agentVersion}-darwin-$arch 
      
rm ./otel.yml && cp ./otel_samples/platformlogs_hostmetrics.yml ./otel.yml && sed -i '' 's#<<ES_ENDPOINT>>#${setup?.elasticsearchUrl}#g' ./otel.yml && sed -i '' 's/<<ES_API_KEY>>/${apiKeyData?.apiKeyEncoded}/g' ./otel.yml`,
      start: './otelcol --config otel.yml',
      type: 'copy',
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
                  <EuiFlexItem grow={false}>
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
                      {
                        defaultMessage:
                          'Collect logs and host metrics using the Elastic distribution of the OTel collector.',
                      }
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
                title: i18n.translate(
                  'xpack.observability_onboarding.otelLogsPanel.steps.platform',
                  {
                    defaultMessage: 'Select your platform',
                  }
                ),

                children: (
                  <EuiFlexGroup direction="column">
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
                    <EuiText>
                      <p>{selectedContent.firstStepTitle}</p>
                    </EuiText>
                    <EuiFlexItem>
                      <EuiCodeBlock language="sh" isCopyable overflowHeight={300}>
                        {selectedContent.content}
                      </EuiCodeBlock>
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
                            target="_blank"
                            data-test-subj="obltOnboardingOtelDownloadConfig"
                          >
                            {i18n.translate(
                              'xpack.observability_onboarding.installOtelCollector.configStep.downloadConfigButton',
                              { defaultMessage: 'Download manifest' }
                            )}
                          </EuiButton>
                        ) : (
                          <EuiCopy textToCopy={selectedContent.content}>
                            {(copy) => (
                              <EuiButton
                                data-test-subj="observabilityOnboardingOtelLogsPanelButton"
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
                  </EuiFlexGroup>
                ),
              },
              {
                title: i18n.translate('xpack.observability_onboarding.otelLogsPanel.steps.start', {
                  defaultMessage: 'Start the collector',
                }),
                children: (
                  <EuiFlexGroup direction="column">
                    {selectedContent.prompt}
                    {selectedContent.start && (
                      <>
                        <EuiText>
                          <p>
                            {i18n.translate(
                              'xpack.observability_onboarding.otelLogsPanel.p.startTheCollectorLabel',
                              {
                                defaultMessage: 'Run the following command to start the collector',
                              }
                            )}
                          </p>
                        </EuiText>
                        <CopyableCodeBlock content={selectedContent.start} />
                      </>
                    )}
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
                        <EuiImage
                          src={http?.staticAssets.getPluginAssetHref('waterfall_screen.svg')}
                          width={160}
                          alt="Illustration"
                          hasShadow
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
                              href="https://www.elastic.co/guide/en/observability/current/get-started-opentelemetry.html"
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

function CopyableCodeBlock({ content }: { content: string }) {
  return (
    <>
      <EuiCodeBlock language="yaml">{content}</EuiCodeBlock>
      <EuiCopy textToCopy={content}>
        {(copy) => (
          <EuiButton
            data-test-subj="observabilityOnboardingCopyableCodeBlockCopyToClipboardButton"
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
    </>
  );
}
