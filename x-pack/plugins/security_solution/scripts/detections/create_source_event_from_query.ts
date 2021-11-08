/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KueryNode } from '@kbn/es-query';
import set from 'set-value';
import { merge } from 'lodash';

// Wildcard rule: Web Application Suspicious Activity: No User Agent
// CIDR: DNS Activity to the Internet
// TODO: Replace CIDR Notation
export const createEventFromKueryNode = (node: KueryNode): object => {
  const sourceEvent = {};
  if (node?.function === 'is') {
    // Value parsing
    // CIDR support
    if (node.arguments[0]?.value.endsWith('ip') && node.arguments[1]?.value.includes('/')) {
      const val = node.arguments[1]?.value.substring(0, node.arguments[1]?.value.indexOf('/'));
      set(sourceEvent, node.arguments[0]?.value, val);
      // string <-> number support
    } else if (node.arguments[0]?.value.endsWith('port')) {
      set(sourceEvent, node.arguments[0]?.value, parseInt(node.arguments[1]?.value, 10));
    } else {
      // write as is -- default
      set(sourceEvent, node.arguments[0]?.value, node.arguments[1]?.value);
    }
    return sourceEvent;
  }

  if (node?.function === 'or') {
    return createEventFromKueryNode(node.arguments[0]);
  }

  if (node?.function === 'and') {
    return {
      ...sourceEvent,
      ...Object.values(node.arguments).reduce<object>((acc, current) => {
        return merge(acc, createEventFromKueryNode(current as KueryNode));
      }, {}),
    };
  }
  return sourceEvent;
};
