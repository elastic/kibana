/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useMemo } from 'react';
import { EuiButtonGroup, EuiPanel, useGeneratedHtmlId, EuiText, EuiSpacer } from '@elastic/eui';
import { useStyles } from './styles';
import { DynamicTreeView } from '../dynamic_tree_view';
import { addTimerangeToQuery } from '../../../utils/add_timerange_to_query';

export const TreeNav = ({ indexPattern, globalFilter }: any) => {
  const styles = useStyles();

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

  const [toggleIdSelected, setToggleIdSelected] = useState(`${treeNavTypePrefix}__0`);

  const options = [
    {
      id: `${treeNavTypePrefix}__0`,
      label: 'Logical view',
    },
    {
      id: `${treeNavTypePrefix}__1`,
      label: 'Infrastructure view',
    },
  ];

  return (
    <>
      <EuiPanel hasBorder>
        <EuiButtonGroup
          name="coarsness"
          legend="This is a basic group"
          options={options}
          idSelected={toggleIdSelected}
          onChange={(id) => setToggleIdSelected(id)}
          buttonSize="compressed"
          isFullWidth
          color="primary"
          css={styles.treeViewSwitcher}
        />
        <EuiSpacer size="xs" />
        <EuiText color="subdued" size="xs">
          Cluster / {toggleIdSelected === `${treeNavTypePrefix}__0` ? 'Namespace' : 'Node'} / Pod /
          Container Image
        </EuiText>
        <EuiSpacer size="s" />
        <DynamicTreeView
          query={JSON.parse(filterQueryWithTimeRange)}
          indexPattern={indexPattern.title}
          tree={[
            {
              key: 'orchestrator.cluster.name',
              iconProps: { type: 'heatmap', color: 'success' },
            },
            {
              key: 'orchestrator.namespace',
              iconProps: { type: 'nested', color: 'primary' },
            },
            {
              key: 'orchestrator.resource.name',
              iconProps: { type: 'package', color: 'warning' },
            },
            {
              key: 'container.image.name',
              iconProps: { type: 'image', color: 'danger' },
            },
          ]}
          aria-label="Logical Tree View"
          onSelect={(key) => {
            // console.log(`${key} was clicked`);
          }}
        />
      </EuiPanel>
    </>
  );
};
