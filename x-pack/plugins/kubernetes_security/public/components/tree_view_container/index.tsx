/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSplitPanel, EuiText } from '@elastic/eui';
import { useStyles } from './styles';
import type { IndexPattern, GlobalFilter } from '../../types';

export interface TreeViewContainerDeps {
  globalFilter: GlobalFilter;
  renderSessionsView: (sessionsFilterQuery: string | undefined) => JSX.Element;
  indexPattern?: IndexPattern;
}

export const TreeViewContainer = ({ globalFilter, renderSessionsView }: TreeViewContainerDeps) => {
  const styles = useStyles();
  // TODO: combine filterQuery with filters from tree view nav

  return (
    <EuiSplitPanel.Outer direction="row" hasBorder borderRadius="m" css={styles.outerPanel}>
      <EuiSplitPanel.Inner color="subdued" grow={false} css={styles.navPanel}>
        <EuiText css={styles.treeViewNav}>
          <p>Tree view nav panel</p>
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner css={styles.sessionsPanel}>
        {renderSessionsView(globalFilter.filterQuery)}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
