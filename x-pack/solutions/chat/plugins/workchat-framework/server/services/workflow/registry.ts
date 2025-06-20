/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Registry, WorkflowDefinition } from '@kbn/wc-framework-types-server';
import { SimpleRegistry } from '../utils';

export type WorkflowRegistry = Registry<WorkflowDefinition>;

export const createWorkflowRegistry = (): WorkflowRegistry => {
  return new SimpleRegistry<WorkflowDefinition>();
};
