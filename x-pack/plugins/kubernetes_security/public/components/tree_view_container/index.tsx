/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSplitPanel, EuiText } from '@elastic/eui';
import { useStyles } from './styles';
import { IndexPattern, GlobalFilter, TreeNavSelection, KubernetesCollection } from '../../types';
import { TreeNav } from './tree_nav';
import { addTreeNavSelectionToFilterQuery } from './helpers';
import { Breadcrumb } from './breadcrumb';

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
  const styles = useStyles();
  const [treeNavSelection, setTreeNavSelection] = useState<TreeNavSelection>({});

  const onTreeNavSelect = useCallback((selection: TreeNavSelection) => {
    setTreeNavSelection(selection);
  }, []);

  const hasSelection = useMemo(
    () => !!treeNavSelection[KubernetesCollection.cluster],
    [treeNavSelection]
  );

  return (
    <EuiSplitPanel.Outer direction="row" hasBorder borderRadius="m" css={styles.outerPanel}>
      <EuiSplitPanel.Inner color="subdued" grow={false} css={styles.navPanel}>
        <EuiText css={styles.treeViewNav}>
          <TreeNav
            indexPattern={indexPattern}
            globalFilter={globalFilter}
            onSelect={onTreeNavSelect}
            hasSelection={hasSelection}
          />
        </EuiText>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner css={styles.sessionsPanel}>
        <Breadcrumb treeNavSelection={treeNavSelection} onSelect={onTreeNavSelect} />
        {hasSelection &&
          renderSessionsView(
            addTreeNavSelectionToFilterQuery(globalFilter.filterQuery, treeNavSelection)
          )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
