/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type {
  WorkflowDefinitionInput,
  WorkflowDefinitionOutput,
  NodeDefinition,
} from '@kbn/wc-framework-types-server';

export const workflowSoTypeName = 'onechat_workflow' as const;

export const workflowSoType: SavedObjectsType<WorkflowAttributes> = {
  name: workflowSoTypeName,
  hidden: true,
  namespaceType: 'multiple-isolated',
  mappings: {
    dynamic: false,
    properties: {
      workflow_id: { type: 'keyword' },
      user_id: { type: 'keyword' },
      categories: { type: 'keyword' },

      access_control: {
        properties: {
          public: { type: 'boolean' },
        },
      },
    },
  },
};

export interface WorkflowAttributes {
  workflow_id: string;
  name: string;
  description: string;
  categories: string[];

  access_control: {
    public: boolean;
  };

  user_id: string;
  user_name: string;

  spec_version: number;
  inputs: WorkflowDefinitionInput[];
  outputs: WorkflowDefinitionOutput[];
  steps: NodeDefinition[];
}
