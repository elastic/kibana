/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type {
  RuleResponse,
  RuleSignatureId,
  RuleTagArray,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import {
  MAX_PREBUILT_RULES_COUNT,
  getExistingPrepackagedRules,
} from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/logic/detection_rules_client/converters/internal_rule_to_api_response';
import { convertRulesFilterToKQL } from '../../../../../../common/detection_engine/rule_management/rule_filtering';
import type { RuleVersionSpecifier } from '../rule_versions/rule_version_specifier';

export interface IPrebuiltRuleObjectsClient {
  fetchAllInstalledRules(): Promise<RuleResponse[]>;
  fetchInstalledRulesByIds(ruleIds: string[]): Promise<RuleResponse[]>;
  fetchInstalledRuleVersions(): Promise<Array<RuleVersionSpecifier & { tags: RuleTagArray }>>;
}

export const createPrebuiltRuleObjectsClient = (
  rulesClient: RulesClient
): IPrebuiltRuleObjectsClient => {
  return {
    fetchAllInstalledRules: (): Promise<RuleResponse[]> => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRules', async () => {
        const rulesData = await getExistingPrepackagedRules({ rulesClient });
        const rules = rulesData.map((rule) => internalRuleToAPIResponse(rule));
        return rules;
      });
    },
    fetchInstalledRulesByIds: (ruleIds: RuleSignatureId[]): Promise<RuleResponse[]> => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRulesByIds', async () => {
        const { data } = await findRules({
          rulesClient,
          perPage: ruleIds.length,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'desc',
          fields: undefined,
          filter: `alert.attributes.params.ruleId:(${ruleIds.join(' or ')})`,
        });

        const rules = data.map((rule) => internalRuleToAPIResponse(rule));
        return rules;
      });
    },
    fetchInstalledRuleVersions: () => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRuleVersions', async () => {
        const filterKQL = convertRulesFilterToKQL({
          showElasticRules: true,
        });

        const rulesData = await findRules({
          rulesClient,
          filter: filterKQL,
          perPage: MAX_PREBUILT_RULES_COUNT,
          page: 1,
          sortField: undefined,
          sortOrder: undefined,
          fields: ['params.ruleId', 'params.version', 'tags'],
        });
        return rulesData.data.map((rule) => ({
          rule_id: rule.params.ruleId,
          version: rule.params.version,
          tags: rule.tags,
        }));
      });
    },
  };
};
