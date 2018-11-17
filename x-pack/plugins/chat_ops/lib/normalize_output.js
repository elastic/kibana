/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export default function normalizeOutput(node) {
  if (typeof node === 'object') {
    if (!node.type) throw new Error('Objects must have a type propery');
    if (!node.value) throw new Error('Objects must have a value property');
    return node;
  }

  return { type: typeof node, value: node };
}
