/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO: Fix all of this magic from EUI; this code is boilerplate from
// EUI examples and isn't easily typed.
export const flattenPanelTree = (tree: any, array: any[] = []) => {
  array.push(tree);

  if (tree.items) {
    tree.items.forEach((item: any) => {
      const { panel } = item;
      if (panel) {
        flattenPanelTree(panel, array);
        item.panel = panel.id;
      }
    });
  }

  return array;
};
