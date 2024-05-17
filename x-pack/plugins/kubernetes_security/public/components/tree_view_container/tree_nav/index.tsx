import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  TREE_NAVIGATION_COLLAPSE,
  TREE_NAVIGATION_EXPAND,
  TREE_VIEW_INFRASTRUCTURE_VIEW,
  TREE_VIEW_LOGICAL_VIEW,
  TREE_VIEW_SWITCHER_LEGEND,
} from '../../../../common/translations';
import { useTreeViewContext } from '../contexts';
import { DynamicTreeView } from '../dynamic_tree_view';
import { INFRASTRUCTURE, LOGICAL, TREE_VIEW } from './constants';
import { useStyles } from './styles';
import { TreeViewKind, TreeViewOptionsGroup } from './types';

export const TreeNav = () => {
  const styles = useStyles();
  const [tree, setTree] = useState(TREE_VIEW.logical);
  const { filterQueryWithTimeRange, onTreeNavSelect, treeNavSelection, setTreeNavSelection } =
    useTreeViewContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const treeNavTypePrefix = useGeneratedHtmlId({
    prefix: 'treeNavType',
  });
  const logicalTreeViewPrefix = `${treeNavTypePrefix}${LOGICAL}`;
  const [toggleIdSelected, setToggleIdSelected] = useState(logicalTreeViewPrefix);

  const selected = useMemo(() => {
    return Object.entries(treeNavSelection)
      .map(([k, v]) => `${k}.${v}`)
      .join();
  }, [treeNavSelection]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const options: TreeViewOptionsGroup[] = useMemo(
    () => [
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
    ],
    [logicalTreeViewPrefix, treeNavTypePrefix]
  );

  const handleTreeViewSwitch = useCallback(
    (id: string, value: TreeViewKind) => {
      setToggleIdSelected(id);
      setTree(TREE_VIEW[value]);
      setTreeNavSelection({});
    },
    [setTreeNavSelection]
  );

  return (
    <>
      {isCollapsed && (
        <EuiToolTip content={TREE_NAVIGATION_EXPAND}>
          <EuiButtonIcon
            onClick={handleToggleCollapse}
            iconType="menuRight"
            aria-label={TREE_NAVIGATION_EXPAND}
          />
        </EuiToolTip>
      )}
      <div style={{ display: isCollapsed ? 'none' : 'inherit' }}>
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
          <EuiFlexItem>
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={TREE_NAVIGATION_COLLAPSE}>
              <EuiButtonIcon
                onClick={handleToggleCollapse}
                iconType="menuLeft"
                aria-label={TREE_NAVIGATION_COLLAPSE}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
        <EuiText color="subdued" size="xs" css={styles.treeViewLegend}>
          {tree.map((t) => t.name).join(' / ')}
        </EuiText>
        <EuiSpacer size="s" />
        <div css={styles.treeViewContainer} className="eui-scrollBar">
          <DynamicTreeView
            query={filterQueryWithTimeRange}
            tree={tree}
            selected={selected}
            onSelect={(selectionDepth, type, key, clusterName) => {
              const newSelectionDepth = {
                ...selectionDepth,
                [type]: key,
                ...(clusterName && { clusterName }),
              };
              onTreeNavSelect(newSelectionDepth);
            }}
          />
        </div>
      </div>
    </>
  );
};
