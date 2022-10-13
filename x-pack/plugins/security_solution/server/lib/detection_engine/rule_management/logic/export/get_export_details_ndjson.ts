/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExportExceptionDetails } from '@kbn/securitysolution-io-ts-list-types';
import type { FullResponseSchema } from '../../../../../../common/detection_engine/schemas/request';

import type { ExportRulesDetails } from '../../../../../../common/detection_engine/schemas/response/export_rules_details_schema';

export const getExportDetailsNdjson = (
  rules: FullResponseSchema[],
  missingRules: Array<{ rule_id: string }> = [],
  exceptionDetails?: ExportExceptionDetails
): string => {
  const stringified: ExportRulesDetails = {
    exported_count:
      exceptionDetails == null
        ? rules.length
        : rules.length +
          exceptionDetails.exported_exception_list_count +
          exceptionDetails.exported_exception_list_item_count,
    exported_rules_count: rules.length,
    missing_rules: missingRules,
    missing_rules_count: missingRules.length,
    ...exceptionDetails,
  };
  return `${JSON.stringify(stringified)}\n`;
};
