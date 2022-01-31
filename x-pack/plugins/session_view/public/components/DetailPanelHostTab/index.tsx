/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiTextColor } from '@elastic/eui';
import { ProcessEventHost } from '../../../common/types/process_tree';
import { useStyles } from './styles';
import { DetailPanelAccordion } from '../DetailPanelAccordion';
import { DetailPanelCopy } from '../DetailPanelCopy';
import { DetailPanelDescriptionList } from '../DetailPanelDescriptionList';
import { DetailPanelListItem } from '../DetailPanelListItem';

interface DetailPanelHostTabDeps {
  processHost: ProcessEventHost;
}

/**
 * Detail panel in the session view.
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
              <DetailPanelCopy textToCopy={processHost.hostname}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.hostname || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>id</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.id}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.id || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>ip</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.ip}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.ip || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>mac</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.mac}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.mac || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.name}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.name || '-'}
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
              <DetailPanelCopy textToCopy={processHost.architecture}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.architecture || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.family</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.os.family}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.os.family || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.full</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.os.full}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.os.full || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.kernel</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.os.kernel}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.os.kernel || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.name</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.os.name}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.os.name || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.platform</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.os.platform}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.os.platform || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
          {
            title: <DetailPanelListItem>os.version</DetailPanelListItem>,
            description: (
              <DetailPanelCopy textToCopy={processHost.os.version}>
                <EuiTextColor color="subdued" css={styles.descriptionSemibold}>
                  {processHost.os.version || '-'}
                </EuiTextColor>
              </DetailPanelCopy>
            ),
          },
        ]}
      />
    </>
  );
};
