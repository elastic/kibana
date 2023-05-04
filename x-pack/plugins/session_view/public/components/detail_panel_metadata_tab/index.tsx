/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiTextColor, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ProcessEventHost,
  ProcessEventContainer,
  ProcessEventOrchestrator,
  ProcessEventCloud,
} from '../../../common/types/process_tree';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { useStyles } from '../detail_panel_process_tab/styles';
import { useStyles as useStylesChild } from './styles';
import { getHostData, getContainerData, getOrchestratorData, getCloudData } from './helpers';

interface DetailPanelMetadataTabDeps {
  processHost?: ProcessEventHost;
  processContainer?: ProcessEventContainer;
  processOrchestrator?: ProcessEventOrchestrator;
  processCloud?: ProcessEventCloud;
}

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelMetadataTab = ({
  processHost,
  processContainer,
  processOrchestrator,
  processCloud,
}: DetailPanelMetadataTabDeps) => {
  const styles = useStyles();
  const stylesChild = useStylesChild();
  const hostData = useMemo(() => getHostData(processHost), [processHost]);
  const containerData = useMemo(() => getContainerData(processContainer), [processContainer]);
  const orchestratorData = useMemo(
    () => getOrchestratorData(processOrchestrator),
    [processOrchestrator]
  );
  const cloudData = useMemo(() => getCloudData(processCloud), [processCloud]);

  return (
    <>
      <DetailPanelAccordion
        id="metadataHost"
        title={i18n.translate('xpack.sessionView.metadataDetailsTab.metadataHost', {
          defaultMessage: 'Host',
        })}
        initialIsOpen={true}
        listItems={[
          {
            title: <DetailPanelListItem>id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.id: "${hostData.id}"`}
                tooltipContent={hostData.id}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {hostData.id}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>hostname</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.hostname: "${hostData.hostname}"`}
                tooltipContent={hostData.hostname}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {hostData.hostname}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>ip</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.ip: "${hostData.ip}"`}
                tooltipContent={hostData.ip}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {hostData.ip}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>mac</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.mac: "${hostData.mac}"`}
                tooltipContent={hostData.mac}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {hostData.mac}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`host.name: "${hostData.name}"`}
                tooltipContent={hostData.name}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {hostData.name}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
        ]}
      >
        <EuiPanel
          hasShadow={false}
          color="plain"
          hasBorder={false}
          borderRadius="m"
          paddingSize="none"
          css={stylesChild.metadataHostOS}
        >
          <DetailPanelAccordion
            id="hostOS"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.host', {
              defaultMessage: 'OS',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>architecture</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.architecture: "${hostData.architecture}"`}
                    tooltipContent={hostData.architecture}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.architecture}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.family</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.family: "${hostData.os.family}"`}
                    tooltipContent={hostData.os.family}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.os.family}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.full</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.full: "${hostData.os.full}"`}
                    tooltipContent={hostData.os.full}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.os.full}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.kernel</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.kernel: "${hostData.os.kernel}"`}
                    tooltipContent={hostData.os.kernel}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.os.kernel}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.name: "${hostData.os.name}"`}
                    tooltipContent={hostData.os.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.os.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.platform</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.platform: "${hostData.os.platform}"`}
                    tooltipContent={hostData.os.platform}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.os.platform}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.version</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.version: "${hostData.os.version}"`}
                    tooltipContent={hostData.os.version}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {hostData.os.version}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </EuiPanel>
      </DetailPanelAccordion>

      {processCloud && (
        <>
          <DetailPanelAccordion
            id="metadataCloud"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.cloud', {
              defaultMessage: 'Cloud',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>instance.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.provider: "${cloudData.instance.name}"`}
                    tooltipContent={cloudData.instance.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {cloudData.instance.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>provider</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.provider: "${cloudData.provider}"`}
                    tooltipContent={cloudData.provider}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {cloudData.provider}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>region</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.region: "${cloudData.region}"`}
                    tooltipContent={cloudData.region}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {cloudData.region}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>account.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.account.id: "${cloudData.account.id}"`}
                    tooltipContent={cloudData.account.id}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {cloudData.account.id}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>project.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.project.id: "${cloudData.project.id}"`}
                    tooltipContent={cloudData.project.id}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {cloudData.project.id}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>project.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`cloud.project.name: "${cloudData.project.name}"`}
                    tooltipContent={cloudData.project.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {cloudData.project.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </>
      )}
      {processContainer && (
        <>
          <DetailPanelAccordion
            id="metadataContainer"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.container', {
              defaultMessage: 'Container',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.id: "${containerData.id}"`}
                    tooltipContent={containerData.id}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {containerData.id}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.name: "${containerData.name}"`}
                    tooltipContent={containerData.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {containerData.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.name: "${containerData.image.name}"`}
                    tooltipContent={containerData.image.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {containerData.image.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.tag</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.tag: "${containerData.image.tag}"`}
                    tooltipContent={containerData.image.tag}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {containerData.image.tag}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.hash.all</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.hash.all: "${containerData.image.hash.all}"`}
                    tooltipContent={containerData.image.hash.all}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {containerData.image.hash.all}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </>
      )}
      {processOrchestrator && (
        <>
          <DetailPanelAccordion
            id="metadataOrchestrator"
            title={i18n.translate('xpack.sessionView.metadataDetailsTab.orchestrator', {
              defaultMessage: 'Orchestrator',
            })}
            listItems={[
              {
                title: <DetailPanelListItem>resource.ip</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.ip: "${orchestratorData.resource.ip}"`}
                    tooltipContent={orchestratorData.resource.ip}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.resource.ip}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.name: "${orchestratorData.resource.name}"`}
                    tooltipContent={orchestratorData.resource.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.resource.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.type</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.type: "${orchestratorData.resource.type}"`}
                    tooltipContent={orchestratorData.resource.type}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.resource.type}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.parent.type</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.parent.type: "${orchestratorData.resource.parent.type}"`}
                    tooltipContent={orchestratorData.resource.parent.type}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.resource.parent.type}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>namespace</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.namespace: "${orchestratorData.namespace}"`}
                    tooltipContent={orchestratorData.namespace}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.namespace}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>cluster.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.cluster.id: "${orchestratorData.cluster.id}"`}
                    tooltipContent={orchestratorData.cluster.id}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.cluster.id}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>cluster.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.cluster.name: "${orchestratorData.cluster.name}"`}
                    tooltipContent={orchestratorData.cluster.name}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {orchestratorData.cluster.name}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
};
