/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionResponse } from '../../../../../../containers/detection_engine/rules';

import type { DryRunResult } from '../types';

/**
 * helper utility that transforms raw BulkActionResponse response to DryRunResult format
 * @param response - raw bulk_actions API response ({@link BulkActionResponse})
 * @returns dry run result ({@link DryRunResult})
 */
export const processDryRunResult = (response: BulkActionResponse | undefined): DryRunResult => {
  const processed = {
    succeededRulesCount: response?.attributes.summary.succeeded,
    failedRulesCount: response?.attributes.summary.failed,
    ruleErrors:
      response?.attributes.errors?.map(({ message, err_code: errorCode, rules }) => ({
        message,
        errorCode,
        ruleIds: rules.map(({ id }) => id),
      })) ?? [],
  };

  return processed;
};
