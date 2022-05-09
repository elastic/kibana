/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiTextColor } from '@elastic/eui';
import { ProcessEventHost } from '../../../common/types/process_tree';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelDescriptionList } from '../detail_panel_description_list';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { useStyles } from '../detail_panel_process_tab/styles';
import { getHostData } from './helpers';

interface DetailPanelHostTabDeps {
  processHost?: ProcessEventHost;
}

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelHostTab = ({ processHost }: DetailPanelHostTabDeps) => {
  const styles = useStyles();
  const hostData = useMemo(() => getHostData(processHost), [processHost]);

  return (
    <>
      <DetailPanelDescriptionList
        listItems={[
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
      />
      <DetailPanelAccordion
        id="hostOS"
        title="Host OS"
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
    </>
  );
};
