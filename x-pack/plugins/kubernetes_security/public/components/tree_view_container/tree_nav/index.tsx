/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { EuiButtonGroup, useGeneratedHtmlId, EuiText, EuiSpacer } from '@elastic/eui';
import {
  TREE_VIEW_INFRASTRUCTURE_VIEW,
  TREE_VIEW_LOGICAL_VIEW,
  TREE_VIEW_SWITCHER_LEGEND,
} from '../../../../common/translations';
import { useStyles } from './styles';
import { DynamicTreeView } from '../dynamic_tree_view';
import { addTimerangeToQuery } from '../../../utils/add_timerange_to_query';
import { INFRASTRUCTURE, LOGICAL, TREE_VIEW } from './constants';
import { TreeViewKind, TreeViewOptionsGroup } from './types';

export const TreeNav = ({ indexPattern, globalFilter }: any) => {
  const styles = useStyles();
  const [tree, setTree] = useState(TREE_VIEW.logical);

  const filterQueryWithTimeRange = useMemo(() => {
    return addTimerangeToQuery(
      globalFilter.filterQuery,
      globalFilter.startDate,
      globalFilter.endDate
    );
  }, [globalFilter.filterQuery, globalFilter.startDate, globalFilter.endDate]);

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
      <EuiText color="subdued" size="xs">
        Cluster / {toggleIdSelected === logicalTreeViewPrefix ? 'Namespace' : 'Node'} / Pod /
        Container Image
      </EuiText>
      <EuiSpacer size="s" />
      <div css={styles.treeViewContainer} className="eui-scrollBar">
        <DynamicTreeView
          query={JSON.parse(filterQueryWithTimeRange)}
          indexPattern={indexPattern.title}
          tree={tree}
          aria-label="Logical Tree View"
          onSelect={(key) => {
            // console.log(`${key} was clicked`);
          }}
        />
      </div>
    </>
  );
};
