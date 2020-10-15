/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TreeItem as TreeItemType } from './tree';
import { Tree } from './tree';

interface Props {
  treeItem: TreeItemType;
}

export const TreeItem = ({ treeItem }: Props) => {
  return (
    <li className="esUiTreeItem">
      <div className="esUiTreeItem__label">{treeItem.label}</div>
      {treeItem.children && <Tree tree={treeItem.children} />}
    </li>
  );
};
