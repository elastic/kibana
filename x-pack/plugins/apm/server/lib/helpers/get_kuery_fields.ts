/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';

export function getKueryFields(nodes: KueryNode[]) {
  const allFields = nodes.map((node) => {
    const {
      arguments: [fieldNameArg],
    } = node;

    if (fieldNameArg.type === 'function') {
      return node.arguments.map((nestedNode: KueryNode) => {
        const {
          arguments: [nestedFieldNameArg],
        } = nestedNode;

        return nestedFieldNameArg.value;
      });
    }
    return fieldNameArg.value;
  });

  return allFields;
}
