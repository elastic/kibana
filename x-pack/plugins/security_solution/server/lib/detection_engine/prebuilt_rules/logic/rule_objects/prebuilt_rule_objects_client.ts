/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RuleResponse } from '../../../../../../common/detection_engine/rule_schema';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import { getExistingPrepackagedRules } from '../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { internalRuleToAPIResponse } from '../../../rule_management/normalization/rule_converters';
import type { PrebuiltRuleVersionInfo } from '../../model/rule_versions/prebuilt_rule_version_info';

export interface IPrebuiltRuleObjectsClient {
  fetchInstalledRules(): Promise<FetchInstalledRulesResult>;
}

export interface FetchInstalledRulesResult {
  installedRules: RuleResponse[];
  installedVersions: PrebuiltRuleVersionInfo[];
}

export const createPrebuiltRuleObjectsClient = (
  rulesClient: RulesClient
): IPrebuiltRuleObjectsClient => {
  return {
    fetchInstalledRules: (): Promise<FetchInstalledRulesResult> => {
      return withSecuritySpan('IPrebuiltRuleObjectsClient.fetchInstalledRules', async () => {
        const rulesData = await getExistingPrepackagedRules({ rulesClient });
        const rules = rulesData.map((rule) => internalRuleToAPIResponse(rule));
        const versions = rules.map((rule) => convertRuleToVersionInfo(rule));
        return {
          installedRules: rules,
          installedVersions: versions,
        };
      });
    },
  };
};

const convertRuleToVersionInfo = (rule: RuleResponse): PrebuiltRuleVersionInfo => {
  const versionInfo: PrebuiltRuleVersionInfo = {
    rule_id: rule.rule_id,
    version: rule.version,
  };
  return versionInfo;
};
