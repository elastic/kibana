/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiSplitPanel,
  EuiSteps,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { AsyncStatus, useAsync } from '../hooks/use_async';
import { useProfilingDependencies } from './contexts/profiling_dependencies/use_profiling_dependencies';
import { ProfilingAppPageTemplate } from './profiling_app_page_template';

export function NoDataPage({ subTitle }: { subTitle: string }) {
  const {
    services: { setupDataCollectionInstructions },
  } = useProfilingDependencies();

  const { data, status } = useAsync(
    ({ http }) => {
      return setupDataCollectionInstructions({ http });
    },
    [setupDataCollectionInstructions]
  );

  const secretToken = data?.variables.secretToken;
  const collectionAgentHostPort = data?.variables.apmServerUrl.replace('https://', '');

  const tabs = [
    {
      key: 'kubernetes',
      title: i18n.translate('xpack.profiling.tabs.kubernetesTitle', {
        defaultMessage: 'Kubernetes',
      }),
      steps: [
        {
          title: i18n.translate('xpack.profiling.tabs.kubernetesRepositoryStep', {
            defaultMessage: 'Configure the Universal Profiling host-agent Helm repository:',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              helm repo add optimyze https://optimyze.cloud/helm-charts
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.kubernetesInstallStep', {
            defaultMessage: 'Install host-agent via Helm:',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`helm install --create-namespace -n=universal-profiling universal-profiling-agent \\
--set "projectID=1,secretToken=${secretToken}" \\
--set "collectionAgentHostPort=${collectionAgentHostPort}" \\
--set "image.baseUrl=docker.elastic.co,image.repository=observability,image.name=profiling-agent" \\
optimyze/pf-host-agent`}
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.kubernetesValidationStep', {
            defaultMessage: 'Validate the host-agent pods are running:',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              kubectl -n universal-profiling get pods
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.postValidationStep', {
            defaultMessage:
              'Use the Helm install output to get host-agent logs and spot potential errors',
          }),
          content: <></>,
        },
      ],
    },
    {
      key: 'docker',
      title: i18n.translate('xpack.profiling.tabs.dockerTitle', {
        defaultMessage: 'Docker',
      }),
      steps: [
        {
          title: i18n.translate('xpack.profiling.tabs.dockerRunContainerStep', {
            defaultMessage: 'Run the Universal Profiling container:',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`docker run --name host-agent --privileged --pid=host -v /etc/machine-id:/etc/machine-id:ro \\
-v /var/run/docker.sock:/var/run/docker.sock -v /sys/kernel/debug:/sys/kernel/debug:ro \\
docker.elastic.co/observability/profiling-agent:stable /root/pf-host-agent \\
-project-id=1 -secret-token=${secretToken} \\
-collection-agent=${collectionAgentHostPort}`}
            </EuiCodeBlock>
          ),
        },
      ],
    },
    {
      key: 'binary',
      title: i18n.translate('xpack.profiling.tabs.binaryTitle', {
        defaultMessage: 'Binary',
      }),
      steps: [
        {
          title: i18n.translate('xpack.profiling.tabs.binaryDownloadStep', {
            defaultMessage: 'Download the latest binary:',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              wget -O pf-host-agent.tgz &quot;https://ela.st/pf-host-agent-amd64&quot; && tar xzf
              pf-host-agent.tgz
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.binaryGrantPermissionStep', {
            defaultMessage: 'Grant executable permissions:',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              chmod +x pf-host-agent/pf-host-agent
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.binaryRunHostAgentStep', {
            defaultMessage: 'Run the Universal Profiling host-agent (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`sudo pf-host-agent/pf-host-agent -project-id=1 -secret-token=${secretToken} -collection-agent=${collectionAgentHostPort}`}
            </EuiCodeBlock>
          ),
        },
      ],
    },
    {
      key: 'deb',
      title: i18n.translate('xpack.profiling.tabs.debTitle', {
        defaultMessage: 'DEB Package',
      }),
      steps: [
        {
          title: i18n.translate('xpack.profiling.tabs.debDownloadPackageStep', {
            defaultMessage:
              'Open the URL below and download the right DEB package for your CPU architecture:',
          }),
          content: (
            <EuiLink target="_blank" href={`https://ela.st/pf-host-agent-linux`}>
              https://ela.st/pf-host-agent-linux
            </EuiLink>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.debInstallPackageStep', {
            defaultMessage: 'Install the DEB package (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`sudo dpkg -i pf-host-agent*.deb`}
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.debEditConfigStep', {
            defaultMessage: 'Edit the configuration (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`echo -e "project-id 1\nsecret-token ${secretToken}\ncollection-agent ${collectionAgentHostPort}" | sudo tee -a /etc/prodfiler/prodfiler.conf`}
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.debStartSystemdServiceStep', {
            defaultMessage:
              'Start the Universal Profiling systemd service (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`sudo systemctl enable pf-host-agent && sudo systemctl restart pf-host-agent`}
            </EuiCodeBlock>
          ),
        },
      ],
    },
    {
      key: 'rpm',
      title: i18n.translate('xpack.profiling.tabs.rpmTitle', {
        defaultMessage: 'RPM Package',
      }),
      steps: [
        {
          title: i18n.translate('xpack.profiling.tabs.rpmDownloadPackageStep', {
            defaultMessage:
              'Open the URL below and download the right RPM package for your CPU architecture:',
          }),
          content: (
            <EuiLink target="_blank" href={`https://ela.st/pf-host-agent-linux`}>
              https://ela.st/pf-host-agent-linux
            </EuiLink>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.rpmInstallPackageStep', {
            defaultMessage: 'Install the RPM package (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`sudo rpm -i pf-host-agent*.rpm`}
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.rpmEditConfigStep', {
            defaultMessage: 'Edit the configuration (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`echo -e "project-id 1\nsecret-token ${secretToken}\ncollection-agent ${collectionAgentHostPort}" | sudo tee -a /etc/prodfiler/prodfiler.conf`}
            </EuiCodeBlock>
          ),
        },
        {
          title: i18n.translate('xpack.profiling.tabs.rpmStartSystemdServiceStep', {
            defaultMessage:
              'Start the Universal Profiling systemd service (requires root privileges):',
          }),
          content: (
            <EuiCodeBlock paddingSize="s" isCopyable>
              {`sudo systemctl enable pf-host-agent && sudo systemctl restart pf-host-agent`}
            </EuiCodeBlock>
          ),
        },
      ],
    },
  ];

  const [selectedTab, setSelectedTab] = useState(tabs[0].key);

  const displayedTab = tabs.find((tab) => tab.key === selectedTab)!;

  const displayedSteps = displayedTab.steps ?? [];

  const isLoading = status === AsyncStatus.Loading;

  return (
    <ProfilingAppPageTemplate
      tabs={[]}
      restrictWidth
      hideSearchBar
      pageTitle={
        <EuiFlexGroup direction="row" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoObservability" size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.profiling.noDataPage.pageTitle', {
              defaultMessage: 'Add profiling data',
            })}
          </EuiFlexItem>
          {isLoading ? (
            <EuiFlexItem>
              <EuiLoadingSpinner />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      }
    >
      {isLoading ? (
        <></>
      ) : (
        <>
          <EuiText>{subTitle}</EuiText>
          <EuiSpacer />
          <EuiSplitPanel.Outer>
            <EuiPanel hasBorder={false} hasShadow={false} grow={false} paddingSize="none">
              <EuiSplitPanel.Inner color="subdued" paddingSize="none">
                <EuiTabs style={{ padding: '0 24px' }}>
                  {tabs.map((tab) => {
                    return (
                      <EuiTab
                        key={tab.key}
                        onClick={() => setSelectedTab(tab.key)}
                        isSelected={tab.key === selectedTab}
                      >
                        {tab.title}
                      </EuiTab>
                    );
                  })}
                </EuiTabs>
              </EuiSplitPanel.Inner>
              <EuiSplitPanel.Inner style={{ padding: '0 24px' }}>
                <EuiSpacer size="xxl" />
                <EuiSteps
                  steps={displayedSteps.map((step) => {
                    return {
                      title: step.title,
                      children: step.content,
                      status: 'incomplete',
                    };
                  })}
                />
              </EuiSplitPanel.Inner>
            </EuiPanel>
          </EuiSplitPanel.Outer>
        </>
      )}
    </ProfilingAppPageTemplate>
  );
}
