/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionsDryRunErrCode } from '../../../../../../../common/constants';
import type { ExportRulesDetails } from '../../../../../../../common/detection_engine/rule_management';
import type { BulkActionResponse } from '../../../../../rule_management/logic';

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

/**
 * transform rules export details {@link ExportRulesDetails} to dry run result format {@link DryRunResult}
 * @param details - {@link ExportRulesDetails} rules export details
 * @returns transformed to {@link DryRunResult}
 */
export const transformExportDetailsToDryRunResult = (details: ExportRulesDetails): DryRunResult => {
  return {
    succeededRulesCount: details.exported_rules_count,
    failedRulesCount: details.missing_rules_count,
    // if there are rules that can't be exported, it means they are immutable. So we can safely put error code as immutable
    ruleErrors: details.missing_rules.length
      ? [
          {
            errorCode: BulkActionsDryRunErrCode.IMMUTABLE,
            message: "Prebuilt rules can't be exported.",
            ruleIds: details.missing_rules.map(({ rule_id: ruleId }) => ruleId),
          },
        ]
      : [],
  };
};
