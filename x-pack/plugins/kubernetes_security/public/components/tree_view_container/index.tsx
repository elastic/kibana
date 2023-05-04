/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSplitPanel, EuiText } from '@elastic/eui';
import { useStyles } from './styles';
import { IndexPattern, GlobalFilter, ResponseActionButtonProps } from '../../types';
import { TreeNav } from './tree_nav';
import { Breadcrumb } from './breadcrumb';
import { TreeViewContextProvider, useTreeViewContext } from './contexts';
import { EmptyState } from './empty_state';
import { addTreeNavSelectionToFilterQuery } from './helpers';
import { useFetchAgentIdForResponder } from './hooks';

export interface TreeViewContainerComponentDeps {
  responseActionButtonProps: ResponseActionButtonProps;
  responseActionClick: () => void;
  handleTreeNavSelection: (agentId: string) => void;
  renderSessionsView: (sessionsFilterQuery: string | undefined) => JSX.Element;
}
export interface TreeViewContainerDeps extends TreeViewContainerComponentDeps {
  globalFilter: GlobalFilter;
  indexPattern?: IndexPattern;
}

export const TreeViewContainer = ({
  globalFilter,
  renderSessionsView,
  indexPattern,
  responseActionClick,
  handleTreeNavSelection,
  responseActionButtonProps,
}: TreeViewContainerDeps) => {
  return (
    <TreeViewContextProvider indexPattern={indexPattern} globalFilter={globalFilter}>
      <TreeViewContainerComponent
        responseActionButtonProps={responseActionButtonProps}
        renderSessionsView={renderSessionsView}
        responseActionClick={responseActionClick}
        handleTreeNavSelection={handleTreeNavSelection}
      />
    </TreeViewContextProvider>
  );
};

const TreeViewContainerComponent = ({
  renderSessionsView,
  responseActionButtonProps,
  responseActionClick,
  handleTreeNavSelection,
}: TreeViewContainerComponentDeps) => {
  const styles = useStyles();

  const {
    hasSelection,
    treeNavSelection,
    sessionViewFilter,
    indexPattern,
    onTreeNavSelect,
    noResults,
    treeNavResponseActionDisabled,
  } = useTreeViewContext();
  const query = JSON.parse(addTreeNavSelectionToFilterQuery(sessionViewFilter, treeNavSelection));
  const { data } = useFetchAgentIdForResponder(query, indexPattern);

  if (data?.agentId) {
    handleTreeNavSelection(data.agentId);
  }

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
            <Breadcrumb
              treeNavSelection={treeNavSelection}
              treeNavResponseActionDisabled={treeNavResponseActionDisabled}
              responseActionClick={responseActionClick}
              responseActionButtonProps={responseActionButtonProps}
              onSelect={onTreeNavSelect}
            />
            {hasSelection && renderSessionsView(sessionViewFilter)}
          </EuiSplitPanel.Inner>
        </>
      )}
    </EuiSplitPanel.Outer>
  );
};
