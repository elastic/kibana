/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { TreeItem as TreeItemComponent } from './tree_item';

export interface TreeItem {
  label: string | JSX.Element;
  children?: TreeItem[];
}

interface Props {
  tree: TreeItem[];
}

export const Tree = ({ tree }: Props) => {
  return (
    <ul className="esUiTree">
      {tree.map((treeItem, i) => (
        <TreeItemComponent key={i} treeItem={treeItem} />
      ))}
    </ul>
  );
};
