/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { GetWorkflowResponse } from '../../../common/http_api/workflows';

export class WorkflowService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async get(workflowId: string) {
    return await this.http.get<GetWorkflowResponse>(
      `/internal/workchat-framework/workflows/${workflowId}`
    );
  }
}
