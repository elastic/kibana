/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../common/api';
import { BaseHandler } from './base_handler';
import { BaseHandlerCommonOptions } from './types';

export class Connectors extends BaseHandler {
  constructor(options: BaseHandlerCommonOptions) {
    super(options, ['connectors']);
  }

  public async compute(): Promise<CaseMetricsResponse> {
    return {
      connectors: { total: 0 },
    };
  }
}
