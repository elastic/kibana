/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../../common/api';
import { Operations } from '../../../authorization';
import { createCaseError } from '../../../common/error';
import { BaseHandler } from '../base_handler';
import { BaseHandlerCommonOptions } from '../types';

export class AlertsCount extends BaseHandler {
  constructor(options: BaseHandlerCommonOptions) {
    super(options, ['alerts.count']);
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { unsecuredSavedObjectsClient, authorization, attachmentService, logger } =
      this.options.clientArgs;

    const { caseId, casesClient } = this.options;

    try {
      // This will perform an authorization check to ensure the user has access to the parent case
      const theCase = await casesClient.cases.get({
        id: caseId,
        includeComments: false,
      });

      const { filter: authorizationFilter } = await authorization.getAuthorizationFilter(
        Operations.getAttachmentMetrics
      );

      const alertsCount = await attachmentService.countAlertsAttachedToCase({
        unsecuredSavedObjectsClient,
        caseId: theCase.id,
        filter: authorizationFilter,
      });

      return {
        alerts: {
          count: alertsCount ?? 0,
        },
      };
    } catch (error) {
      throw createCaseError({
        message: `Failed to count alerts attached case id: ${caseId}: ${error}`,
        error,
        logger,
      });
    }
  }
}
