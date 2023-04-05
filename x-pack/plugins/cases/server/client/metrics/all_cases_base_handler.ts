/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesMetricsResponse } from '../../../common/api';
import { BaseHandler } from './base_handler';
import type { AllCasesBaseHandlerCommonOptions } from './types';

export abstract class AllCasesBaseHandler extends BaseHandler<CasesMetricsResponse> {
  protected readonly owner?: string | string[];

  constructor(options: AllCasesBaseHandlerCommonOptions, features?: string[]) {
    const { owner, ...restOptions } = options;
    super(restOptions, features);

    this.owner = owner;
  }
}
