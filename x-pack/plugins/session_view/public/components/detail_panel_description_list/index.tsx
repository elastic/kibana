/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import { EuiDescriptionList } from '@elastic/eui';
import { useStyles } from './styles';

interface DetailPanelDescriptionListDeps {
  listItems: Array<{
    title: NonNullable<ReactNode>;
    description: NonNullable<ReactNode>;
  }>;
}

/**
 * Description list in session view detail panel.
 */
export const DetailPanelDescriptionList = ({ listItems }: DetailPanelDescriptionListDeps) => {
  const styles = useStyles();
  return (
    <EuiDescriptionList
      type="column"
      listItems={listItems}
      css={styles.descriptionList}
      titleProps={{ style: styles.tabListTitle }}
      descriptionProps={{ style: styles.tabListDescription }}
      data-test-subj="sessionView:detail-panel-description-list"
    />
  );
};
