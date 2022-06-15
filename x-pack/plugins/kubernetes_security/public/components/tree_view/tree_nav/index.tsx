/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiIcon,
  EuiTreeView,
  EuiToken,
  EuiButtonGroup,
  EuiPanel,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useStyles } from './styles';

export const TreeNav = () => {
  const styles = useStyles();

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

  const items = [
    {
      label: 'Item One',
      id: 'item_one',
      icon: <EuiIcon type="folderClosed" />,
      iconWhenExpanded: <EuiIcon type="folderOpen" />,
      isExpanded: true,
      children: [
        {
          label: 'Item A',
          id: 'item_a',
          icon: <EuiIcon type="document" />,
        },
        {
          label: 'Item B',
          id: 'item_b',
          icon: <EuiIcon type="arrowRight" />,
          iconWhenExpanded: <EuiIcon type="arrowDown" />,
          children: [
            {
              label: 'A Cloud',
              id: 'item_cloud',
              icon: <EuiToken iconType="tokenConstant" />,
            },
            {
              label: "I'm a Bug",
              id: 'item_bug',
              icon: <EuiToken iconType="tokenEnum" />,
              callback: () => {},
            },
          ],
        },
        {
          label: 'Item C',
          id: 'item_c',
          icon: <EuiIcon type="arrowRight" />,
          iconWhenExpanded: <EuiIcon type="arrowDown" />,
          children: [
            {
              label: 'Another Cloud',
              id: 'item_cloud2',
              icon: <EuiToken iconType="tokenConstant" />,
            },
            {
              label: 'This one is a really long string that we will check truncates correctly',
              id: 'item_bug2',
              icon: <EuiToken iconType="tokenEnum" />,
              callback: () => {},
            },
          ],
        },
      ],
    },
    {
      label: 'Item Two',
      id: 'item_two',
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
        <EuiTreeView items={items} aria-label="Sample Folder Tree" />
      </EuiPanel>
    </>
  );
};
