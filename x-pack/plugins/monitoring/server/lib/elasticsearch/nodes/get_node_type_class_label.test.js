/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNodeTypeClassLabel } from './get_node_type_class_label';

describe('Node Type and Label', () => {
  describe('when master node', () => {
    it('type is indicated by boolean flag', () => {
      const node = {
        master: true,
      };
      const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(node);
      expect(nodeType).toBe('master');
      expect(nodeTypeLabel).toBe('Master Node');
      expect(nodeTypeClass).toBe('starFilled');
    });
    it('type is indicated by string', () => {
      const node = {};
      const type = 'master';
      const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(node, type);
      expect(nodeType).toBe('master');
      expect(nodeTypeLabel).toBe('Master Node');
      expect(nodeTypeClass).toBe('starFilled');
    });
  });
  it('when type is generic node', () => {
    const node = {};
    const type = 'node';
    const { nodeType, nodeTypeLabel, nodeTypeClass } = getNodeTypeClassLabel(node, type);
    expect(nodeType).toBe('node');
    expect(nodeTypeLabel).toBe('Node');
    expect(nodeTypeClass).toBe('storage');
  });
});
