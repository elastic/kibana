/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';

import type { Logger } from '@kbn/core/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { RulesClient, RuleExecutorServices } from '@kbn/alerting-plugin/server';

import { getExportDetailsNdjson } from './get_export_details_ndjson';

import { isAlertType } from '../../../rule_schema';
import { findRules } from '../search/find_rules';
import { getRuleExceptionsForExport } from './get_export_rule_exceptions';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from '../../../rule_actions_legacy';
import { internalRuleToAPIResponse } from '../../normalization/rule_converters';
import type { RuleResponse } from '../../../../../../common/detection_engine/rule_schema';

interface ExportSuccessRule {
  statusCode: 200;
  rule: RuleResponse;
}

interface ExportFailedRule {
  statusCode: 404;
  missingRuleId: { rule_id: string };
}

export interface RulesErrors {
  exportedCount: number;
  missingRules: Array<{ rule_id: string }>;
  rules: RuleResponse[];
}

export const getExportByObjectIds = async (
  rulesClient: RulesClient,
  exceptionsClient: ExceptionListClient | undefined,
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'],
  objects: Array<{ rule_id: string }>,
  logger: Logger
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
  exceptionLists: string | null;
}> => {
  const rulesAndErrors = await getRulesFromObjects(
    rulesClient,
    savedObjectsClient,
    objects,
    logger
  );

  // Retrieve exceptions
  const exceptions = rulesAndErrors.rules.flatMap((rule) => rule.exceptions_list ?? []);
  const { exportData: exceptionLists, exportDetails: exceptionDetails } =
    await getRuleExceptionsForExport(exceptions, exceptionsClient);

  const rulesNdjson = transformDataToNdjson(rulesAndErrors.rules);
  const exportDetails = getExportDetailsNdjson(
    rulesAndErrors.rules,
    rulesAndErrors.missingRules,
    exceptionDetails
  );

  return {
    rulesNdjson,
    exportDetails,
    exceptionLists,
  };
};

export const getRulesFromObjects = async (
  rulesClient: RulesClient,
  savedObjectsClient: RuleExecutorServices['savedObjectsClient'],
  objects: Array<{ rule_id: string }>,
  logger: Logger
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
      const joinedIds = chunkedArray.map((object) => object.rule_id).join(' OR ');
      return `alert.attributes.params.ruleId: (${joinedIds})`;
    })
    .join(' OR ');
  const rules = await findRules({
    rulesClient,
    filter,
    page: 1,
    fields: undefined,
    perPage: 10000,
    sortField: undefined,
    sortOrder: undefined,
  });
  const alertIds = rules.data.map((rule) => rule.id);
  const legacyActions = await legacyGetBulkRuleActionsSavedObject({
    alertIds,
    savedObjectsClient,
    logger,
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
        rule: internalRuleToAPIResponse(matchingRule, null, legacyActions[matchingRule.id]),
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
