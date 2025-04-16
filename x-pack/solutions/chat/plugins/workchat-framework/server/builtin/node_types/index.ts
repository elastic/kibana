/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type NodeTypeDefinition } from '@kbn/wc-framework-types-server';
import type { NodeTypeRegistry } from '../../framework/nodes';
import { getToolActionNodeTypeDefinition } from './tool_action';

// TODO: register all.
export const registerBuiltInNodeTypes = ({ registry }: { registry: NodeTypeRegistry }) => {
  const definitions: Array<NodeTypeDefinition<any>> = [getToolActionNodeTypeDefinition()];

  definitions.forEach((definition) => {
    registry.register(definition);
  });
};
