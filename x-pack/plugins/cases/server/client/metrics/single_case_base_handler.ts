/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseMetricsFeature, SingleCaseMetricsResponse } from '../../../common/types/api';
import { BaseHandler } from './base_handler';
import type { SingleCaseBaseHandlerCommonOptions } from './types';

export abstract class SingleCaseBaseHandler extends BaseHandler<SingleCaseMetricsResponse> {
  protected readonly caseId: string;

  constructor(options: SingleCaseBaseHandlerCommonOptions, features?: CaseMetricsFeature[]) {
    const { caseId, ...restOptions } = options;
    super(restOptions, features);

    this.caseId = caseId;
  }
}
