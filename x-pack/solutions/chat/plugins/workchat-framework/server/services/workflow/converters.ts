/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { WorkflowDefinition } from '@kbn/wc-framework-types-server';
import type { WorkflowAttributes } from '../../saved_objects/workflow';

export const savedObjectToModel = ({
  attributes,
}: SavedObject<WorkflowAttributes>): WorkflowDefinition => {
  return {
    id: attributes.workflow_id,
    name: attributes.name,
    description: attributes.description,
    type: 'graph',
    inputs: attributes.inputs,
    outputs: attributes.outputs,
    steps: attributes.steps,
  };
};
