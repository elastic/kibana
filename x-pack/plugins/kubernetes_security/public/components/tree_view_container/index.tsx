/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSplitPanel, EuiText } from '@elastic/eui';
import { useStyles } from './styles';
import { IndexPattern, GlobalFilter } from '../../types';
import { TreeNav } from './tree_nav';
import { Breadcrumb } from './breadcrumb';
import { TreeViewContextProvider, useTreeViewContext } from './contexts';
import { EmptyState } from './empty_state';

export interface TreeViewContainerDeps {
  globalFilter: GlobalFilter;
  renderSessionsView: (sessionsFilterQuery: string | undefined) => JSX.Element;
  indexPattern?: IndexPattern;
}

export const TreeViewContainer = ({
  globalFilter,
  renderSessionsView,
  indexPattern,
}: TreeViewContainerDeps) => {
  return (
    <TreeViewContextProvider indexPattern={indexPattern} globalFilter={globalFilter}>
      <TreeViewContainerComponent renderSessionsView={renderSessionsView} />
    </TreeViewContextProvider>
  );
};

const TreeViewContainerComponent = ({
  renderSessionsView,
}: Pick<TreeViewContainerDeps, 'renderSessionsView'>) => {
  const styles = useStyles();

  const { hasSelection, treeNavSelection, sessionViewFilter, onTreeNavSelect, noResults } =
    useTreeViewContext();

  return (
    <EuiSplitPanel.Outer direction="row" hasBorder borderRadius="m" css={styles.outerPanel}>
      {noResults ? (
        <EmptyState />
      ) : (
        <>
          <EuiSplitPanel.Inner color="subdued" grow={false} css={styles.navPanel}>
            <EuiText>
              <TreeNav />
            </EuiText>
          </EuiSplitPanel.Inner>
          <EuiSplitPanel.Inner css={styles.sessionsPanel}>
            <Breadcrumb treeNavSelection={treeNavSelection} onSelect={onTreeNavSelect} />
            {hasSelection && renderSessionsView(sessionViewFilter)}
          </EuiSplitPanel.Inner>
        </>
      )}
    </EuiSplitPanel.Outer>
  );
};
