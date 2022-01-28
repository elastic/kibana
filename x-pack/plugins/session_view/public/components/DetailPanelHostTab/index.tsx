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
import { DetailPanelDescriptionList } from '../DetailPanelDescriptionList';

interface DetailPanelHostTabDeps {
  processHost: ProcessEventHost | undefined;
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
            title: 'hostname',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.hostname || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'id',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.id || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'ip',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.ip || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'mac',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.mac || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'name',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.name || '-'}
              </EuiTextColor>
            ),
          },
        ]}
      />
      <DetailPanelAccordion
        id="hostOS"
        title="Host OS"
        listItems={[
          {
            title: 'architecture',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.architecture || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'os.family',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.os.family || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'os.full',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.os.full || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'os.kernel',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.os.kernel || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'os.name',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.os.name || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'os.platform',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.os.platform || '-'}
              </EuiTextColor>
            ),
          },
          {
            title: 'os.version',
            description: (
              <EuiTextColor color="subdued" css={styles.tabDescriptionSemibold}>
                {processHost?.os.version || '-'}
              </EuiTextColor>
            ),
          },
        ]}
      />
    </>
  );
};
