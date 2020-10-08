/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const flattenPanelTree = (tree, array = []) => {
  array.push(tree);

  if (tree.items) {
    tree.items.forEach((item) => {
      if (item.panel) {
        flattenPanelTree(item.panel, array);
        item.panel = item.panel.id;
      }
    });
  }

  return array;
};
