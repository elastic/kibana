/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';
import type { ISavedObjectsExporter, KibanaRequest } from '@kbn/core/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { internalRuleToAPIResponse } from '../../normalization/rule_converters';
import type { RuleResponse } from '../../../../../../common/api/detection_engine/model/rule_schema';
import type { RuleParams } from '../../../rule_schema';
import { hasValidRuleType } from '../../../rule_schema';
import { findRules } from '../search/find_rules';
import { transformRuleToExportableFormat } from '../../utils/utils';
import { getRuleExceptionsForExport } from './get_export_rule_exceptions';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { getRuleActionConnectorsForExport } from './get_export_rule_action_connectors';

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
  ruleIds: string[],
  actionsExporter: ISavedObjectsExporter,
  request: KibanaRequest,
  actionsClient: ActionsClient
): Promise<{
  rulesNdjson: string;
  exportDetails: string;
  exceptionLists: string | null;
  actionConnectors: string;
}> => {
  const rulesAndErrors = await getRulesFromObjects(rulesClient, ruleIds);
  const { rules, missingRules } = rulesAndErrors;

  // Retrieve exceptions
  const exceptions = rules.flatMap((rule) => rule.exceptions_list ?? []);
  const { exportData: exceptionLists, exportDetails: exceptionDetails } =
    await getRuleExceptionsForExport(exceptions, exceptionsClient);

  // Retrieve Action-Connectors
  const { actionConnectors, actionConnectorDetails } = await getRuleActionConnectorsForExport(
    rules,
    actionsExporter,
    request,
    actionsClient
  );

  const rulesNdjson = transformDataToNdjson(rules);
  const exportDetails = getExportDetailsNdjson(
    rules,
    missingRules,
    exceptionDetails,
    actionConnectorDetails
  );

  return {
    rulesNdjson,
    exportDetails,
    exceptionLists,
    actionConnectors,
  };
};

const getRulesFromObjects = async (
  rulesClient: RulesClient,
  ruleIds: string[]
): Promise<RulesErrors> => {
  // It's important to avoid too many clauses in the request otherwise ES will fail to process the request
  // with `too_many_clauses` error (see https://github.com/elastic/kibana/issues/170015). The clauses limit
  // used to be set via `indices.query.bool.max_clause_count` but it's an option anymore. The limit is [calculated
  // dynamically](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html) based
  // on available CPU and memory but the minimum value is 1024.
  // 1024 chunk size helps to solve the problem and use the maximum safe number of clauses.
  const CHUNK_SIZE = 1024;
  const processChunk = async (ids: string[]) => {
    const rulesResult = await findRules({
      rulesClient,
      filter: `alert.attributes.params.ruleId: (${ids.join(' OR ')})`,
      page: 1,
      fields: undefined,
      perPage: CHUNK_SIZE,
      sortField: undefined,
      sortOrder: undefined,
    });
    const rulesMap = new Map<string, PartialRule<RuleParams>>();

    for (const rule of rulesResult.data) {
      rulesMap.set(rule.params.ruleId, rule);
    }

    const rulesAndErrors = ids.map((ruleId) => {
      const matchingRule = rulesMap.get(ruleId);

      return matchingRule != null &&
        hasValidRuleType(matchingRule) &&
        matchingRule.params.immutable !== true
        ? {
            statusCode: 200,
            rule: transformRuleToExportableFormat(internalRuleToAPIResponse(matchingRule)),
          }
        : {
            statusCode: 404,
            missingRuleId: { rule_id: ruleId },
          };
    });

    return rulesAndErrors;
  };

  const ruleIdChunks = chunk(ruleIds, CHUNK_SIZE);
  // We expect all rules to be processed here to avoid any situation when export of some rules failed silently.
  // If some error happens it just bubbles up as is and processed in the upstream code.
  const rulesAndErrorsChunks = await Promise.all(ruleIdChunks.map(processChunk));
  const rulesAndErrors = rulesAndErrorsChunks.flat();

  const missingRules = rulesAndErrors.filter(
    (resp) => resp.statusCode === 404
  ) as ExportFailedRule[];
  const exportedRules = rulesAndErrors.filter(
    (resp) => resp.statusCode === 200
  ) as ExportSuccessRule[];

  return {
    exportedCount: exportedRules.length,
    missingRules: missingRules.map((mr) => mr.missingRuleId),
    rules: exportedRules.map((er) => er.rule),
  };
};
