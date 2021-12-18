/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExportRulesDetails } from './export_rules_details_schema';
import {
  ExportExceptionDetailsMock,
  getExceptionExportDetailsMock,
} from '../../../../../lists/common/schemas/response/exception_export_details_schema.mock';

interface RuleDetailsMock {
  totalCount?: number;
  rulesCount?: number;
  missingCount?: number;
  missingRules?: Array<Record<'rule_id', string>>;
}

export const getOutputDetailsSample = (ruleDetails?: RuleDetailsMock): ExportRulesDetails => ({
  exported_count: ruleDetails?.totalCount ?? 0,
  exported_rules_count: ruleDetails?.rulesCount ?? 0,
  missing_rules: ruleDetails?.missingRules ?? [],
  missing_rules_count: ruleDetails?.missingCount ?? 0,
});

export const getOutputDetailsSampleWithExceptions = (
  ruleDetails?: RuleDetailsMock,
  exceptionDetails?: ExportExceptionDetailsMock
): ExportRulesDetails => ({
  ...getOutputDetailsSample(ruleDetails),
  ...getExceptionExportDetailsMock(exceptionDetails),
});

export const getSampleDetailsAsNdjson = (sample: ExportRulesDetails): string => {
  return `${JSON.stringify(sample)}\n`;
};
