/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTextColor, EuiPanel, EuiAccordion, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import {
  ProcessEventHost,
  ProcessEventContainer,
  ProcessEventOrchestrator,
} from '../../../common/types/process_tree';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelDescriptionList } from '../detail_panel_description_list';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { dataOrDash } from '../../utils/data_or_dash';
import { useStyles } from '../detail_panel_process_tab/styles';

interface DetailPanelHostTabDeps {
  processHost?: ProcessEventHost;
  processContainer?: ProcessEventContainer;
  processOrchestrator?: ProcessEventOrchestrator;
}

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelHostTab = ({
  processHost,
  processContainer,
  processOrchestrator,
}: DetailPanelHostTabDeps) => {
  const styles = useStyles();

  return (
    <>
      <EuiAccordion
        id={'metadataHost'}
        arrowDisplay="right"
        initialIsOpen={true}
        buttonContent={
          <EuiFlexGroup
            alignItems="center"
            gutterSize="s"
            responsive={false}
            css={styles.accordionButton}
          >
            <EuiFlexItem grow={false}>
              <span>{'Host'}</span>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        css={styles.accordion}
        data-test-subj="sessionView:detail-panel-accordion"
      >
        <DetailPanelDescriptionList
          listItems={[
            {
              title: <DetailPanelListItem>hostname</DetailPanelListItem>,
              description: (
                <DetailPanelCopy
                  textToCopy={`host.hostname: "${dataOrDash(processHost?.hostname)}"`}
                >
                  <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                    {dataOrDash(processHost?.hostname)}
                  </EuiTextColor>
                </DetailPanelCopy>
              ),
            },
            {
              title: <DetailPanelListItem>id</DetailPanelListItem>,
              description: (
                <DetailPanelCopy textToCopy={`host.id: "${dataOrDash(processHost?.id)}"`}>
                  <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                    {dataOrDash(processHost?.id)}
                  </EuiTextColor>
                </DetailPanelCopy>
              ),
            },
            {
              title: <DetailPanelListItem>ip</DetailPanelListItem>,
              description: (
                <DetailPanelCopy textToCopy={`host.ip: "${dataOrDash(processHost?.ip)}"`}>
                  <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                    {dataOrDash(processHost?.ip)}
                  </EuiTextColor>
                </DetailPanelCopy>
              ),
            },
            {
              title: <DetailPanelListItem>mac</DetailPanelListItem>,
              description: (
                <DetailPanelCopy textToCopy={`host.mac: "${dataOrDash(processHost?.mac)}"`}>
                  <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                    {dataOrDash(processHost?.mac)}
                  </EuiTextColor>
                </DetailPanelCopy>
              ),
            },
            {
              title: <DetailPanelListItem>name</DetailPanelListItem>,
              description: (
                <DetailPanelCopy textToCopy={`host.name: "${dataOrDash(processHost?.name)}"`}>
                  <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                    {dataOrDash(processHost?.name)}
                  </EuiTextColor>
                </DetailPanelCopy>
              ),
            },
          ]}
        />
        <EuiPanel
          hasShadow={false}
          color="subdued"
          hasBorder={true}
          borderRadius="m"
          paddingSize="none"
          css={styles.metadataHostOS}
        >
          <DetailPanelAccordion
            id="hostOS"
            title="Host OS"
            listItems={[
              {
                title: <DetailPanelListItem>architecture</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.architecture: "${dataOrDash(processHost?.architecture)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.architecture)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.family</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.family: "${dataOrDash(processHost?.os?.family)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.os?.family)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.full</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.full: "${dataOrDash(processHost?.os?.full)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.os?.full)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.kernel</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.kernel: "${dataOrDash(processHost?.os?.kernel)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.os?.kernel)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.name: "${dataOrDash(processHost?.os?.name)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.os?.name)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.platform</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.platform: "${dataOrDash(processHost?.os?.platform)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.os?.platform)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>os.version</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`host.os.version: "${dataOrDash(processHost?.os?.version)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processHost?.os?.version)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
        </EuiPanel>
      </EuiAccordion>
      {/* <DetailPanelAccordion
        id="metadataContainer"
        title="Container"
        listItems={[
          {
            title: <DetailPanelListItem>id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={`container.id: "${dataOrDash(processContainer?.id)}"`}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processContainer?.id)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`container.name: "${dataOrDash(processContainer?.name)}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processContainer?.name)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>image.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`container.image.name: "${dataOrDash(processContainer?.image?.name)}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processContainer?.image?.name)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>image.tag</DetailPanelListItem>,
            description: (
              <DetailPanelCopy
                textToCopy={`container.image.tag: "${dataOrDash(processContainer?.image?.tag)}"`}
              >
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processContainer?.image?.tag)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
        ]}
      /> */}
      {processOrchestrator && processContainer && (
        <>
          <DetailPanelAccordion
            id="metadataContainer"
            title="Container"
            listItems={[
              {
                title: <DetailPanelListItem>id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.id: "${dataOrDash(processContainer?.id)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processContainer?.id)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.name: "${dataOrDash(processContainer?.name)}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processContainer?.name)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.name: "${dataOrDash(
                      processContainer?.image?.name
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processContainer?.image?.name)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.tag</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.tag: "${dataOrDash(
                      processContainer?.image?.tag
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processContainer?.image?.tag)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>image.hash.all</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`container.image.hash.all: "${dataOrDash(
                      processContainer?.image?.hash?.all
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processContainer?.image?.hash?.all)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
            ]}
          />
          <DetailPanelAccordion
            id="metadataOrchestrator"
            title="Orchestrator"
            listItems={[
              {
                title: <DetailPanelListItem>resource.ip;</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.ip: "${dataOrDash(
                      processOrchestrator?.resource?.ip
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.resource?.ip)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.name: "${dataOrDash(
                      processOrchestrator?.resource?.name
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.resource?.name)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>resource.type</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.resource.type: "${dataOrDash(
                      processOrchestrator?.resource?.type
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.resource?.type)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>namespace</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.namespace: "${dataOrDash(
                      processOrchestrator?.namespace
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.namespace)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>cluster.id</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.cluster.id: "${dataOrDash(
                      processOrchestrator?.cluster?.id
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.cluster?.id)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>cluster.name</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.cluster.name: "${dataOrDash(
                      processOrchestrator?.cluster?.name
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.cluster?.name)}
                    </EuiTextColor>
                  </DetailPanelCopy>
                ),
              },
              {
                title: <DetailPanelListItem>parent.type</DetailPanelListItem>,
                description: (
                  <DetailPanelCopy
                    textToCopy={`orchestrator.parent.type: "${dataOrDash(
                      processOrchestrator?.parent?.type
                    )}"`}
                  >
                    <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                      {dataOrDash(processOrchestrator?.parent?.type)}
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
