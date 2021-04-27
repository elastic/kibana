/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import { RulesSchema } from '../../../../common/detection_engine/schemas/response/rules_schema';
import { AlertsClient } from '../../../../../alerting/server';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { isAlertType } from '../rules/types';
import { transformAlertToRule } from '../routes/rules/utils';
import { transformDataToNdjson } from '../../../utils/read_stream/create_stream_from_ndjson';
import { INTERNAL_RULE_ID_KEY } from '../../../../common/constants';
import { findRules } from './find_rules';

interface ExportSuccessRule {
  statusCode: 200;
  rule: Partial<RulesSchema>;
}

interface ExportFailedRule {
  statusCode: 404;
  missingRuleId: { rule_id: string };
}

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
  // If we put more than 1024 ids in one block like "alert.attributes.tags: (id1 OR id2 OR ... OR id1100)"
  // then the KQL -> ES DSL query generator still puts them all in the same "should" array, but ES defaults
  // to limiting the length of "should" arrays to 1024. By chunking the array into blocks of 1024 ids,
  // we can force the KQL -> ES DSL query generator into grouping them in blocks of 1024.
  // The generated KQL query here looks like
  // "alert.attributes.tags: (id1 OR id2 OR ... OR id1024) OR alert.attributes.tags: (...) ..."
  const chunkedObjects = chunk(objects, 1024);
  const filter = chunkedObjects
    .map((chunkedArray) => {
      const joinedIds = chunkedArray
        .map((object) => `"${INTERNAL_RULE_ID_KEY}:${object.rule_id}"`)
        .join(' OR ');
      return `alert.attributes.tags: (${joinedIds})`;
    })
    .join(' OR ');
  const rules = await findRules({
    alertsClient,
    filter,
    page: 1,
    fields: undefined,
    perPage: 10000,
    sortField: undefined,
    sortOrder: undefined,
  });
  const alertsAndErrors = objects.map(({ rule_id: ruleId }) => {
    const matchingRule = rules.data.find((rule) => rule.params.ruleId === ruleId);
    if (
      matchingRule != null &&
      isAlertType(matchingRule) &&
      matchingRule.params.immutable !== true
    ) {
      return {
        statusCode: 200,
        rule: transformAlertToRule(matchingRule),
      };
    } else {
      return {
        statusCode: 404,
        missingRuleId: { rule_id: ruleId },
      };
    }
  });

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
