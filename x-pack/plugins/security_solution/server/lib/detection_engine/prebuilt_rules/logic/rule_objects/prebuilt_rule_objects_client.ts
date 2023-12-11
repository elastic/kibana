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
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { findRules } from '../../../rule_management/logic/search/find_rules';
import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/normalization/rule_converters';

export interface IPrebuiltRuleObjectsClient {
  fetchAllInstalledRules(): Promise<RuleResponse[]>;
  fetchInstalledRulesByIds(ruleIds: string[]): Promise<RuleResponse[]>;
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
  };
};
