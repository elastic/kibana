/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { WorkflowService } from './workflows';
import type { InternalServices } from './types';

export const createServices = ({ core: { http } }: { core: CoreStart }): InternalServices => {
  const workflowService = new WorkflowService({ http });

  return {
    workflowService,
  };
};
