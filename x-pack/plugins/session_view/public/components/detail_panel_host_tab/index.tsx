/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { ProcessEventHost } from '../../../common/types/process_tree';
import { DetailPanelAccordion } from '../detail_panel_accordion';
import { DetailPanelCopy } from '../detail_panel_copy';
import { DetailPanelDescriptionList } from '../detail_panel_description_list';
import { DetailPanelListItem } from '../detail_panel_list_item';
import { dataOrDash } from '../../utils/data_or_dash';
import { useStyles } from '../detail_panel_process_tab/styles';

interface DetailPanelHostTabDeps {
  processHost?: ProcessEventHost;
}

/**
 * Host Panel of  session view detail panel.
 */
export const DetailPanelHostTab = ({ processHost }: DetailPanelHostTabDeps) => {
  const styles = useStyles();

  return (
    <>
      <DetailPanelDescriptionList
        listItems={[
          {
            title: <DetailPanelListItem>hostname</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.hostname}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.hostname)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.id}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.id)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>ip</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.ip}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.ip)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>mac</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.mac}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.mac)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.name}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.name)}
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
              <DetailPanelCopy textToCopy={processHost?.architecture}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.architecture)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.family</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.os?.family}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.os?.family)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.full</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.os?.full}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.os?.full)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.kernel</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.os?.kernel}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.os?.kernel)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.os?.name}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.os?.name)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.platform</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.os?.platform}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.os?.platform)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.version</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost?.os?.version}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {dataOrDash(processHost?.os?.version)}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
        ]}
      />
    </>
  );
};
