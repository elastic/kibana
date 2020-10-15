/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { AlertsClient } from '../../../../../alerts/server';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { isAlertType } from '../rules/types';
import { readRules } from './read_rules';
import { transformAlertToRule } from '../routes/rules/utils';
import { transformDataToNdjson } from '../../../utils/read_stream/create_stream_from_ndjson';

interface ExportSuccessRule {
  statusCode: 200;
  rule: Partial<RulesSchema>;
}

interface ExportFailedRule {
  statusCode: 404;
  missingRuleId: { rule_id: string };
}

type ExportRules = ExportSuccessRule | ExportFailedRule;

export interface RulesErrors {
  exportedCount: number;
  missingRules: Array<{ rule_id: string }>;
  rules: Array<Partial<RulesSchema>>;
}

export const getExportByObjectIds = async (
  alertsClient: AlertsClient,
  objects: Array<{ rule_id: string }>
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
}> => {
  const rulesAndErrors = await getRulesFromObjects(alertsClient, objects);
  const rulesNdjson = transformDataToNdjson(rulesAndErrors.rules);
  const exportDetails = getExportDetailsNdjson(rulesAndErrors.rules, rulesAndErrors.missingRules);
  return { rulesNdjson, exportDetails };
};

export const getRulesFromObjects = async (
  alertsClient: AlertsClient,
  objects: Array<{ rule_id: string }>
): Promise<RulesErrors> => {
  const alertsAndErrors = await Promise.all(
    objects.reduce<Array<Promise<ExportRules>>>((accumPromise, object) => {
      const exportWorkerPromise = new Promise<ExportRules>(async (resolve) => {
        try {
          const rule = await readRules({ alertsClient, ruleId: object.rule_id, id: undefined });
          if (rule != null && isAlertType(rule) && rule.params.immutable !== true) {
            const transformedRule = transformAlertToRule(rule);
            resolve({
              statusCode: 200,
              rule: transformedRule,
            });
          } else {
            resolve({
              statusCode: 404,
              missingRuleId: { rule_id: object.rule_id },
            });
          }
        } catch {
          resolve({
            statusCode: 404,
            missingRuleId: { rule_id: object.rule_id },
          });
        }
      });
      return [...accumPromise, exportWorkerPromise];
    }, [])
  );

  const missingRules = alertsAndErrors.filter(
    (resp) => resp.statusCode === 404
  ) as ExportFailedRule[];
  const exportedRules = alertsAndErrors.filter(
    (resp) => resp.statusCode === 200
  ) as ExportSuccessRule[];

  return {
    exportedCount: exportedRules.length,
    missingRules: missingRules.map((mr) => mr.missingRuleId),
    rules: exportedRules.map((er) => er.rule),
  };
};
