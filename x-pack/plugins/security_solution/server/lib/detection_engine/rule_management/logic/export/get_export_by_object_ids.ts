/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
import { transformDataToNdjson } from '@kbn/securitysolution-utils';
import type { ISavedObjectsExporter, KibanaRequest } from '@kbn/core/server';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { RulesClient, PartialRule } from '@kbn/alerting-plugin/server';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { internalRuleToAPIResponse } from '../detection_rules_client/converters/internal_rule_to_api_response';
import type { RuleParams } from '../../../rule_schema';
import { hasValidRuleType } from '../../../rule_schema';
import { findRules } from '../search/find_rules';
import { getRuleExceptionsForExport } from './get_export_rule_exceptions';
import { getExportDetailsNdjson } from './get_export_details_ndjson';
import { getRuleActionConnectorsForExport } from './get_export_rule_action_connectors';
import type { ExportableRule } from './exportable_rule';
import { transformRuleToExportableFormat } from './transform_rule_to_exportable_format';

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
}> =>
  withSecuritySpan('getExportByObjectIds', async () => {
    const rulesAndErrors = await fetchRulesByIds(rulesClient, ruleIds);
    const { rules, missingRuleIds } = rulesAndErrors;

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
      missingRuleIds,
      exceptionDetails,
      actionConnectorDetails
    );

    return {
      rulesNdjson,
      exportDetails,
      exceptionLists,
      actionConnectors,
    };
  });

interface FetchRulesResult {
  rules: ExportableRule[];
  missingRuleIds: string[];
}

const fetchRulesByIds = async (
  rulesClient: RulesClient,
  ruleIds: string[]
): Promise<FetchRulesResult> => {
  // It's important to avoid too many clauses in the request otherwise ES will fail to process the request
  // with `too_many_clauses` error (see https://github.com/elastic/kibana/issues/170015). The clauses limit
  // used to be set via `indices.query.bool.max_clause_count` but it's an option anymore. The limit is [calculated
  // dynamically](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-settings.html) based
  // on available CPU and memory but the minimum value is 1024.
  // 1024 chunk size helps to solve the problem and use the maximum safe number of clauses.
  const CHUNK_SIZE = 1024;
  // We need to decouple from the number of existing rules and let the complexity/load depend only on the number of users
  // exporting rules simultaneously. By using limited parallelization via p-map we trade speed for stability and scalability.
  const CHUNKS_PROCESSED_IN_PARALLEL = 2;
  const processChunk = async (ids: string[]) =>
    withSecuritySpan('processChunk', async () => {
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
              rule: transformRuleToExportableFormat(internalRuleToAPIResponse(matchingRule)),
            }
          : {
              missingRuleId: ruleId,
            };
      });

      return rulesAndErrors;
    });

  const ruleIdChunks = chunk(ruleIds, CHUNK_SIZE);
  // We expect all rules to be processed here to avoid any situation when export of some rules failed silently.
  // If some error happens it just bubbles up as is and processed in the upstream code.
  const rulesAndErrorsChunks = await pMap(ruleIdChunks, processChunk, {
    concurrency: CHUNKS_PROCESSED_IN_PARALLEL,
  });

  const missingRuleIds: string[] = [];
  const rules: ExportableRule[] = [];

  for (const rulesAndErrors of rulesAndErrorsChunks) {
    for (const response of rulesAndErrors) {
      if (response.missingRuleId) {
        missingRuleIds.push(response.missingRuleId);
      }

      if (response.rule) {
        rules.push(response.rule);
      }
    }
  }

  return {
    rules,
    missingRuleIds,
  };
};
