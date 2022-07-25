/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { EuiButtonGroup, useGeneratedHtmlId, EuiText, EuiSpacer } from '@elastic/eui';
import {
  TREE_VIEW_INFRASTRUCTURE_VIEW,
  TREE_VIEW_LOGICAL_VIEW,
  TREE_VIEW_SWITCHER_LEGEND,
} from '../../../../common/translations';
import { useStyles } from './styles';
import { DynamicTreeView } from '../dynamic_tree_view';
import { INFRASTRUCTURE, LOGICAL, TREE_VIEW } from './constants';
import { TreeViewKind, TreeViewOptionsGroup } from './types';
import { useTreeViewContext } from '../contexts';

export const TreeNav = () => {
  const styles = useStyles();
  const [tree, setTree] = useState(TREE_VIEW.logical);
  const [selected, setSelected] = useState('');

  const { filterQueryWithTimeRange, onTreeNavSelect } = useTreeViewContext();

  const treeNavTypePrefix = useGeneratedHtmlId({
    prefix: 'treeNavType',
  });

  const logicalTreeViewPrefix = `${treeNavTypePrefix}${LOGICAL}`;

  const [toggleIdSelected, setToggleIdSelected] = useState(logicalTreeViewPrefix);

  const options: TreeViewOptionsGroup[] = [
    {
      id: logicalTreeViewPrefix,
      label: TREE_VIEW_LOGICAL_VIEW,
      value: LOGICAL,
    },
    {
      id: `${treeNavTypePrefix}${INFRASTRUCTURE}`,
      label: TREE_VIEW_INFRASTRUCTURE_VIEW,
      value: INFRASTRUCTURE,
    },
  ];

  const handleTreeViewSwitch = (id: string, value: TreeViewKind) => {
    setToggleIdSelected(id);
    setTree(TREE_VIEW[value]);
  };

  return (
    <>
      <EuiButtonGroup
        name="coarsness"
        legend={TREE_VIEW_SWITCHER_LEGEND}
        options={options}
        idSelected={toggleIdSelected}
        onChange={handleTreeViewSwitch}
        buttonSize="compressed"
        isFullWidth
        color="primary"
        css={styles.treeViewSwitcher}
      />
      <EuiSpacer size="xs" />
      <EuiText color="subdued" size="xs" css={styles.treeViewLegend}>
        {tree.map((t) => t.name).join(' / ')}
      </EuiText>
      <EuiSpacer size="s" />
      <div css={styles.treeViewContainer} className="eui-scrollBar">
        <DynamicTreeView
          query={filterQueryWithTimeRange}
          tree={tree}
          aria-label="Logical Tree View"
          selected={selected}
          onSelect={(selectionDepth, key, type) => {
            const newSelectionDepth = {
              ...selectionDepth,
              [type]: key,
            };
            setSelected(
              Object.entries(newSelectionDepth)
                .map(([k, v]) => `${k}.${v}`)
                .join()
            );
            onTreeNavSelect(newSelectionDepth);
          }}
        />
      </div>
    </>
  );
};
