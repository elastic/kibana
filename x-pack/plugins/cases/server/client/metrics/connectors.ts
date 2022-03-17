/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../common/api';
import { Operations } from '../../authorization';
import { createCaseError } from '../../common/error';
import { BaseHandler } from './base_handler';
import { BaseHandlerCommonOptions } from './types';

export class Connectors extends BaseHandler {
  constructor(options: BaseHandlerCommonOptions) {
    super(options, ['connectors']);
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { unsecuredSavedObjectsClient, authorization, userActionService, logger } =
      this.options.clientArgs;

    const { caseId } = this.options;

    const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
      Operations.getUserActionMetrics
    );

    const uniqueConnectors = await userActionService.getUniqueConnectors({
      unsecuredSavedObjectsClient,
      caseId,
      filter: authorizationFilter,
    });

    try {
      return {
        connectors: { total: uniqueConnectors.length },
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to retrieve total connectors metrics for case id: ${caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}
