/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginElement } from './plugin_element';
import { IfElement } from './if_element';
import { ElseElement } from './else_element';

export function flattenPipelineSection(tree, depth, parentId) {
  let list = [];

  tree.forEach(node => {
    const type = node.constructor.name;
    if (type === 'PluginStatement') {
      list.push(new PluginElement(node, depth, parentId));
    } else if (type === 'IfStatement') {
      list.push(new IfElement(node, depth, parentId));
      list = list.concat(flattenPipelineSection(node.trueStatements, depth + 1, node.id));
      if (node.elseStatements && node.elseStatements.length) {
        const elseElement = new ElseElement(node, depth, parentId);
        list.push(elseElement);
        list = list.concat(flattenPipelineSection(node.elseStatements, depth + 1, elseElement.id));
      }
    }
  });

  return list;
}
