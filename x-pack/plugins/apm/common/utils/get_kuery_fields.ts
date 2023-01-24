/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import { compact } from 'lodash';

export function getKueryFields(nodes: KueryNode[]): string[] {
  const allFields = nodes
    .map((node) => {
      const {
        arguments: [fieldNameArg],
      } = node;

      if (fieldNameArg.type === 'function') {
        return getKueryFields(node.arguments);
      }

      return fieldNameArg.value;
    })
    .flat();

  return compact(allFields);
}
