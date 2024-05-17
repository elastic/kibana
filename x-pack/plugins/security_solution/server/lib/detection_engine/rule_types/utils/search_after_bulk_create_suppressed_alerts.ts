/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SuppressedAlertService } from '@kbn/rule-registry-plugin/server';

import type { ExperimentalFeatures } from '../../../../../common';
import type { AlertSuppressionCamel } from '../../../../../common/api/detection_engine/model/rule_schema';
import type {
  SearchAfterAndBulkCreateParams,
  SearchAfterAndBulkCreateReturnType,
  WrapSuppressedHits,
} from '../types';
import { getSuppressionMaxSignalsWarning } from './utils';

interface SearchAfterAndBulkCreateSuppressedAlertsParams extends SearchAfterAndBulkCreateParams {
  wrapSuppressedHits: WrapSuppressedHits;
  alertTimestampOverride: Date | undefined;
  alertWithSuppression: SuppressedAlertService;
  alertSuppression?: AlertSuppressionCamel;
  experimentalFeatures: ExperimentalFeatures;
}

import { bulkCreateSuppressedAlertsInMemory } from './bulk_create_suppressed_alerts_in_memory';
import type { SearchAfterAndBulkCreateFactoryParams } from './search_after_bulk_create_factory';
import { searchAfterAndBulkCreateFactory } from './search_after_bulk_create_factory';

/**
 * search_after through documents and re-index using bulk endpoint
 * and suppress alerts
 */
export const searchAfterAndBulkCreateSuppressedAlerts = async (
  params: SearchAfterAndBulkCreateSuppressedAlertsParams
): Promise<SearchAfterAndBulkCreateReturnType> => {
  const {
    wrapHits,
    bulkCreate,
    services,
    buildReasonMessage,
    ruleExecutionLogger,
    tuple,
    alertSuppression,
    wrapSuppressedHits,
    alertWithSuppression,
    alertTimestampOverride,
    experimentalFeatures,
  } = params;

  const bulkCreateExecutor: SearchAfterAndBulkCreateFactoryParams['bulkCreateExecutor'] = async ({
    enrichedEvents,
    toReturn,
  }) => {
    return bulkCreateSuppressedAlertsInMemory({
      wrapHits,
      bulkCreate,
      services,
      buildReasonMessage,
      ruleExecutionLogger,
      tuple,
      alertSuppression,
      wrapSuppressedHits,
      alertWithSuppression,
      alertTimestampOverride,
      enrichedEvents,
      toReturn,
      experimentalFeatures,
    });
  };

  return searchAfterAndBulkCreateFactory({
    ...params,
    bulkCreateExecutor,
    getWarningMessage: getSuppressionMaxSignalsWarning,
  });
};
