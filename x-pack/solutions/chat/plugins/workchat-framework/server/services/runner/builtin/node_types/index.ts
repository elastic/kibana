/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeTypeDefinition } from '@kbn/wc-framework-types-server';
import type { NodeTypeRegistry } from '../../nodes';
import { getToolExecutionNodeTypeDefinition } from './tool_execution';
import { getWorkflowExecutionNodeTypeDefinition } from './workflow_execution';
import { getParallelSequencesNodeTypeDefinition } from './parallel_sequences';
import { getPromptNodeTypeDefinition } from './prompt';
import { getLoopNodeTypeDefinition } from './loop';
import { getIntentRecognitionNodeTypeDefinition } from './intent_recognition';

export const registerBuiltInNodeTypes = ({ registry }: { registry: NodeTypeRegistry }) => {
  const definitions: Array<NodeTypeDefinition<any>> = [
    getToolExecutionNodeTypeDefinition(),
    getWorkflowExecutionNodeTypeDefinition(),
    getParallelSequencesNodeTypeDefinition(),
    getPromptNodeTypeDefinition(),
    getLoopNodeTypeDefinition(),
    getIntentRecognitionNodeTypeDefinition(),
  ];

  definitions.forEach((definition) => {
    registry.register(definition);
  });
};
